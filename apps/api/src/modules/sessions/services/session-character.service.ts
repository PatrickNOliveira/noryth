import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { CharactersService } from '@modules/characters/services/characters.service';
import { SessionCharacter } from '../entities/session-character.entity';
import {
  SessionCharacterDto,
  toSessionCharacterDto,
} from '../dto/session-character.dto';
import { AddSessionCharacterDto } from '../dto/add-session-character.dto';
import { UpdateSessionCharacterDto } from '../dto/update-session-character.dto';
import {
  SESSION_CHARACTER_EVENTS,
  SPRITE_DIRECTIONS,
} from '../session-character.constants';
import {
  SESSION_CHARACTERS_REPOSITORY,
  SessionCharactersRepository,
} from '../repositories/session-characters.repository';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import { CharacterSessionSpriteService } from './character-session-sprite.service';

/**
 * Places campaign characters on the active session map. Master-only writes;
 * players read (only visible characters + their own). Position is percent-based.
 * Realtime is via the port; to avoid leaking private NPCs, invisible characters
 * are NOT broadcast — visibility transitions emit add/remove accordingly.
 */
@Injectable()
export class SessionCharacterService {
  private readonly logger = new Logger(SessionCharacterService.name);

  constructor(
    @Inject(SESSION_CHARACTERS_REPOSITORY)
    private readonly repo: SessionCharactersRepository,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly sprites: CharacterSessionSpriteService,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  /** Placed characters on the active session's current map, honoring visibility. */
  async list(
    userId: string,
    campaignId: string,
  ): Promise<SessionCharacterDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) return [];

    const placed = await this.repo.findBySessionAndMap(
      session.id,
      session.currentMapId,
    );
    const rows = await this.buildDtos(campaignId, placed);
    if (isMaster) return rows.map((r) => r.dto);
    // Players: only visible characters, plus their own placed character.
    return rows
      .filter((r) => r.dto.isVisibleToPlayers || r.controllerId === userId)
      .map((r) => r.dto);
  }

  async add(
    userId: string,
    campaignId: string,
    dto: AddSessionCharacterDto,
  ): Promise<SessionCharacterDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) {
      throw new BadRequestException('Não há uma sessão ativa nesta campanha.');
    }
    const character = await this.characters.findInCampaign(
      campaignId,
      dto.characterId,
    );
    if (!character) throw new NotFoundException('Personagem não encontrado');

    // Idempotent: if this character is already on the current map, return the
    // existing placement instead of creating a duplicate (protects against
    // repeated/duplicate requests, not just the frontend guard).
    const existing = await this.repo.findByCharacterInMap(
      session.id,
      session.currentMapId,
      character.id,
    );
    if (existing) {
      const [{ dto: existingDto }] = await this.buildDtos(campaignId, [existing]);
      return existingDto;
    }

    const entity = await this.repo.save(
      this.repo.create({
        campaignId,
        sessionId: session.id,
        mapId: session.currentMapId,
        characterId: character.id,
        x: dto.x ?? 50,
        y: dto.y ?? 50,
        facing: dto.facing ?? 'FRONT',
        // Player characters default visible; NPCs default hidden.
        isVisibleToPlayers:
          dto.isVisibleToPlayers ?? character.isPlayerCharacter,
        createdByUserId: userId,
        updatedByUserId: userId,
      }),
    );

    // Kick off sprite generation (both directions) without blocking placement.
    await this.sprites.ensureSprites(campaignId, character.id, userId, [
      ...SPRITE_DIRECTIONS,
    ]);

    const [{ dto: dtoOut }] = await this.buildDtos(campaignId, [entity]);
    if (entity.isVisibleToPlayers) this.emitAdded(dtoOut, userId);
    return dtoOut;
  }

  async update(
    userId: string,
    campaignId: string,
    id: string,
    dto: UpdateSessionCharacterDto,
  ): Promise<SessionCharacterDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const entity = await this.loadOrFail(campaignId, id);
    const wasVisible = entity.isVisibleToPlayers;

    if (dto.x !== undefined) entity.x = dto.x;
    if (dto.y !== undefined) entity.y = dto.y;
    if (dto.facing !== undefined) entity.facing = dto.facing;
    if (dto.sizeScale !== undefined) entity.sizeScale = dto.sizeScale;
    if (dto.isVisibleToPlayers !== undefined) {
      entity.isVisibleToPlayers = dto.isVisibleToPlayers;
    }
    entity.updatedByUserId = userId;
    const saved = await this.repo.save(entity);

    const [{ dto: dtoOut }] = await this.buildDtos(campaignId, [saved]);
    const isVisible = saved.isVisibleToPlayers;
    // Broadcast so players' views converge, without leaking hidden characters.
    // originUserId lets the acting master ignore its own echo (it already
    // applied the change optimistically and keeps hidden characters visible).
    if (!wasVisible && isVisible) this.emitAdded(dtoOut, userId);
    else if (wasVisible && !isVisible) this.emitRemoved(saved, userId);
    else if (isVisible) this.emitMoved(saved, dto.clientMutationId, userId);
    return dtoOut;
  }

  async remove(
    userId: string,
    campaignId: string,
    id: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const entity = await this.loadOrFail(campaignId, id);
    const wasVisible = entity.isVisibleToPlayers;
    await this.repo.remove(entity);
    if (wasVisible) this.emitRemoved(entity, userId);
  }

  // ── helpers ─────────────────────────────────────────────────

  private async buildDtos(
    campaignId: string,
    placed: SessionCharacter[],
  ): Promise<Array<{ dto: SessionCharacterDto; controllerId: string | null }>> {
    const characterIds = [...new Set(placed.map((p) => p.characterId))];
    const spriteRows = await this.repo.findSpritesByCharacters(characterIds);
    const spritesByChar = new Map<string, typeof spriteRows>();
    for (const s of spriteRows) {
      const list = spritesByChar.get(s.characterId) ?? [];
      list.push(s);
      spritesByChar.set(s.characterId, list);
    }

    const out: Array<{ dto: SessionCharacterDto; controllerId: string | null }> = [];
    for (const entity of placed) {
      const character = await this.characters.findInCampaign(
        campaignId,
        entity.characterId,
      );
      const sprites = (spritesByChar.get(entity.characterId) ?? []).map((s) => ({
        direction: s.direction,
        imageUrl: s.imageUrl,
        imageStatus: s.imageStatus,
      }));
      out.push({
        dto: toSessionCharacterDto(
          entity,
          character?.name ?? 'Personagem',
          sprites,
        ),
        controllerId: character?.controlledByUserId ?? null,
      });
    }
    return out;
  }

  private async loadOrFail(
    campaignId: string,
    id: string,
  ): Promise<SessionCharacter> {
    const entity = await this.repo.findById(id);
    if (!entity || entity.campaignId !== campaignId) {
      throw new NotFoundException('Personagem da sessão não encontrado');
    }
    return entity;
  }

  private emitAdded(dto: SessionCharacterDto, originUserId?: string): void {
    void this.emit(dto.campaignId, SESSION_CHARACTER_EVENTS.added, {
      sessionId: dto.sessionId,
      mapId: dto.mapId,
      character: dto,
      originUserId: originUserId ?? null,
    });
  }

  private emitMoved(
    entity: SessionCharacter,
    clientMutationId?: string,
    originUserId?: string,
  ): void {
    void this.emit(entity.campaignId, SESSION_CHARACTER_EVENTS.moved, {
      sessionId: entity.sessionId,
      mapId: entity.mapId,
      sessionCharacterId: entity.id,
      characterId: entity.characterId,
      x: entity.x,
      y: entity.y,
      facing: entity.facing,
      sizeScale: entity.sizeScale,
      updatedAt: entity.updatedAt,
      clientMutationId: clientMutationId ?? null,
      originUserId: originUserId ?? null,
    });
  }

  private emitRemoved(entity: SessionCharacter, originUserId?: string): void {
    void this.emit(entity.campaignId, SESSION_CHARACTER_EVENTS.removed, {
      sessionId: entity.sessionId,
      mapId: entity.mapId,
      sessionCharacterId: entity.id,
      originUserId: originUserId ?? null,
    });
  }

  private async emit(
    campaignId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(campaignRoom(campaignId), event, {
        tableId: campaignId,
        ...payload,
      });
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }
}
