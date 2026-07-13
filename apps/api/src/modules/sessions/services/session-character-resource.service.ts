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
import { CharacterResourceService } from '@modules/campaign-resources/services/character-resource.service';
import {
  SESSION_CHARACTERS_REPOSITORY,
  SessionCharactersRepository,
} from '../repositories/session-characters.repository';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import { SESSION_CHARACTER_EVENTS } from '../session-character.constants';
import { AdjustSessionResourceDto } from '../dto/adjust-session-resource.dto';
import {
  SessionCharacterResourceDto,
  toSessionCharacterResourceDto,
} from '../dto/session-character-resource.dto';

/**
 * Spend/add a placed character's resource during a live session (master only).
 * Validates the session context, delegates the clamp + persistence to the domain
 * {@link CharacterResourceService} (which owns effective-value resolution and the
 * master check), then broadcasts the single updated resource via the realtime
 * PORT. Private resources are NOT broadcast — the campaign room is shared and has
 * no per-role channel, so this mirrors how invisible characters are kept off the
 * wire; the acting master already reflects the change optimistically.
 */
@Injectable()
export class SessionCharacterResourceService {
  private readonly logger = new Logger(SessionCharacterResourceService.name);

  constructor(
    @Inject(SESSION_CHARACTERS_REPOSITORY)
    private readonly repo: SessionCharactersRepository,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    private readonly campaigns: CampaignsService,
    private readonly resources: CharacterResourceService,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  async adjust(
    userId: string,
    campaignId: string,
    sessionCharacterId: string,
    resourceDefinitionId: string,
    dto: AdjustSessionResourceDto,
  ): Promise<SessionCharacterResourceDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) {
      throw new BadRequestException('Não há uma sessão ativa nesta campanha.');
    }
    const placed = await this.repo.findById(sessionCharacterId);
    if (
      !placed ||
      placed.campaignId !== campaignId ||
      placed.sessionId !== session.id
    ) {
      throw new NotFoundException('Personagem da sessão não encontrado');
    }

    // Domain service enforces master + effective clamp + persists the base current.
    const resource = await this.resources.adjust(
      userId,
      campaignId,
      placed.characterId,
      resourceDefinitionId,
      dto.delta,
    );

    const payload = toSessionCharacterResourceDto(
      session,
      placed,
      resource,
      userId,
      dto.clientMutationId ?? null,
    );
    // Broadcast AFTER the change is persisted; never leak private resources.
    if (resource.isVisibleToPlayers) {
      await this.emit(campaignId, SESSION_CHARACTER_EVENTS.resourceUpdated, payload);
    }
    return payload;
  }

  private async emit(
    campaignId: string,
    event: string,
    payload: SessionCharacterResourceDto,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(campaignRoom(campaignId), event, payload);
    } catch (error) {
      this.logger.warn(
        `Realtime emit "${event}" failed: ${(error as Error).message}`,
      );
    }
  }
}
