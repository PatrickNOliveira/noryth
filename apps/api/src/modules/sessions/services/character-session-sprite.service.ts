import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  IMAGE_GENERATION_PROVIDER,
  ImageGenerationProvider,
} from '@shared/providers/image-generation/image-generation.provider';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@shared/providers/storage/storage.provider';
import { QUEUE_PROVIDER, QueueProvider } from '@shared/providers/queue/queue.provider';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { imageGenerationInFlight } from '@shared/utils/image-generation.util';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { CharactersService } from '@modules/characters/services/characters.service';
import { FactionsService } from '@modules/factions/services/factions.service';
import { CharacterSessionSprite } from '../entities/character-session-sprite.entity';
import {
  CHARACTER_SESSION_SPRITE_EVENTS,
  GENERATE_CHARACTER_SESSION_SPRITE_JOB,
  GenerateCharacterSessionSpritePayload,
  SPRITE_DIRECTIONS,
  SpriteDirection,
} from '../session-character.constants';
import {
  SESSION_CHARACTERS_REPOSITORY,
  SessionCharactersRepository,
} from '../repositories/session-characters.repository';
import { CharacterSessionSpriteAgent } from './character-session-sprite.agent';

/** Sprite state exposed to the frontend (per direction). */
export interface SpriteView {
  direction: SpriteDirection;
  imageUrl: string | null;
  imageStatus: string;
}

/**
 * Generates and serves a character's 2.5D SESSION SPRITES (per facing) — a
 * distinct asset from the portrait. Generation is async and rides the ports
 * (image/queue/storage/realtime); no infrastructure is imported here.
 */
@Injectable()
export class CharacterSessionSpriteService {
  private readonly logger = new Logger(CharacterSessionSpriteService.name);

  constructor(
    @Inject(SESSION_CHARACTERS_REPOSITORY)
    private readonly repo: SessionCharactersRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly factions: FactionsService,
    private readonly agent: CharacterSessionSpriteAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  /** Explicit (re)generation. Master OR the character's controller may trigger. */
  async generate(
    userId: string,
    campaignId: string,
    characterId: string,
    directions: SpriteDirection[] = [...SPRITE_DIRECTIONS],
  ): Promise<SpriteView[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    const isMaster = campaign.masterId === userId;
    const isController = character.controlledByUserId === userId;
    if (!isMaster && !isController) {
      throw new ForbiddenException(
        'Apenas o mestre ou o dono do personagem pode gerar os sprites de sessão.',
      );
    }
    await this.ensureSprites(campaignId, characterId, userId, directions, true);
    return this.viewsFor(characterId);
  }

  /**
   * Ensures the character has session sprites in the given directions. Defensive
   * and idempotent (never throws): enqueues generation only for directions that
   * are missing/failed and not already in flight. Called when a character is
   * placed on the map — permission is the caller's responsibility.
   */
  async ensureSprites(
    campaignId: string,
    characterId: string,
    requestedBy: string,
    directions: SpriteDirection[] = [...SPRITE_DIRECTIONS],
    force = false,
  ): Promise<void> {
    for (const direction of directions) {
      try {
        let sprite = await this.repo.findSpriteByCharacterAndDirection(
          characterId,
          direction,
        );
        if (!sprite) {
          sprite = await this.repo.saveSprite(
            this.repo.createSprite({
              campaignId,
              characterId,
              direction,
              imageStatus: 'none',
            }),
          );
        }
        if (!force && sprite.imageStatus === 'completed' && sprite.imageUrl) {
          continue;
        }
        if (imageGenerationInFlight(sprite.imageStatus, sprite.updatedAt)) {
          continue;
        }
        await this.startGeneration(sprite, requestedBy);
      } catch (error) {
        this.logger.warn(
          `ensureSprites(${characterId}/${direction}) failed: ${(error as Error).message}`,
        );
      }
    }
  }

  /** Current sprite views (per direction) for a character. */
  async viewsFor(characterId: string): Promise<SpriteView[]> {
    const sprites = await this.repo.findSpritesByCharacter(characterId);
    return sprites.map((s) => ({
      direction: s.direction,
      imageUrl: s.imageUrl,
      imageStatus: s.imageStatus,
    }));
  }

  // ── async worker ────────────────────────────────────────────

  async processSpriteJob(
    payload: GenerateCharacterSessionSpritePayload,
  ): Promise<void> {
    const sprite = await this.repo.findSpriteById(payload.spriteId);
    if (!sprite) {
      this.logger.warn(`Sprite job for missing sprite ${payload.spriteId}`);
      return;
    }
    const character = await this.characters.findInCampaign(
      sprite.campaignId,
      sprite.characterId,
    );
    if (!character) {
      this.logger.warn(`Sprite job for missing character ${sprite.characterId}`);
      return;
    }
    const campaign = await this.campaigns.findByIdOrFail(sprite.campaignId);
    const allowed =
      campaign.masterId === payload.requestedBy ||
      character.controlledByUserId === payload.requestedBy;
    if (!allowed) {
      this.logger.warn(
        `Sprite requester ${payload.requestedBy} no longer master/controller`,
      );
      return;
    }

    sprite.imageStatus = 'processing';
    sprite.imageError = null;
    await this.repo.saveSprite(sprite);
    await this.emit(sprite, CHARACTER_SESSION_SPRITE_EVENTS.processing, {
      status: 'PROCESSING',
    });

    try {
      const faction = character.factionId
        ? await this.factions.findInCampaign(campaign.id, character.factionId)
        : null;
      const prompt = await this.agent.build(
        {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: character.name,
          title: character.title,
          shortDescription: character.shortDescription,
          description: character.description,
          appearance: character.appearance,
        },
        sprite.direction,
        {
          artDirection: campaign.characterArtDirection,
          factionName: faction?.name,
        },
      );
      this.logger.log(
        `Sprite prompt for ${character.id}/${sprite.direction}:\n  ${prompt.imagePrompt}`,
      );

      // Use the portrait as a reference when the provider supports i2i.
      const useI2I =
        this.imageProvider.supportsImageToImage() && !!character.imageUrl;
      const generated = useI2I
        ? await this.imageProvider.editImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            baseImageUrl: character.imageUrl as string,
          })
        : await this.imageProvider.generateImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
          });

      const path = `campaigns/${sprite.campaignId}/characters/${sprite.characterId}/session-sprite/${sprite.direction.toLowerCase()}/${randomUUID()}.png`;
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      sprite.imagePath = stored.path;
      sprite.imageUrl = stored.url;
      sprite.imageStatus = 'completed';
      sprite.imageError = null;
      sprite.lastPrompt = prompt.imagePrompt;
      sprite.lastNegativePrompt = prompt.negativePrompt;
      await this.repo.saveSprite(sprite);

      await this.emit(sprite, CHARACTER_SESSION_SPRITE_EVENTS.completed, {
        status: 'COMPLETED',
        imageUrl: stored.url,
      });
      this.logger.log(`✔ Sprite done: ${character.id}/${sprite.direction}`);
    } catch (error) {
      const message = (error as Error).message;
      sprite.imageStatus = 'failed';
      sprite.imageError = message;
      await this.repo.saveSprite(sprite);
      await this.emit(sprite, CHARACTER_SESSION_SPRITE_EVENTS.failed, {
        status: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(
        `✖ Sprite failed: ${character.id}/${sprite.direction}: ${message}`,
      );
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  private async startGeneration(
    sprite: CharacterSessionSprite,
    requestedBy: string,
  ): Promise<void> {
    if (!this.imageProvider.isConfigured()) {
      sprite.imageStatus = 'failed';
      sprite.imageError = 'Geração de imagem por IA não está configurada.';
      await this.repo.saveSprite(sprite);
      return;
    }
    sprite.imageStatus = 'pending';
    sprite.imageError = null;
    const saved = await this.repo.saveSprite(sprite);
    try {
      await this.queue.enqueue<GenerateCharacterSessionSpritePayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_CHARACTER_SESSION_SPRITE_JOB,
        payload: { spriteId: saved.id, requestedBy },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(`Enqueued sprite generation: ${saved.id}`);
    } catch (error) {
      saved.imageStatus = 'failed';
      saved.imageError = (error as Error).message;
      await this.repo.saveSprite(saved);
    }
  }

  private async emit(
    sprite: CharacterSessionSprite,
    event: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(campaignRoom(sprite.campaignId), event, {
        tableId: sprite.campaignId,
        characterId: sprite.characterId,
        direction: sprite.direction,
        ...extra,
      });
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }
}
