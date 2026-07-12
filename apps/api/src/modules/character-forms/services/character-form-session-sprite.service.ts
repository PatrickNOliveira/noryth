import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { characterRoom } from '@modules/characters/character.constants';
import { FactionsService } from '@modules/factions/services/factions.service';
import {
  SPRITE_DIRECTIONS,
  SpriteDirection,
} from '@modules/sessions/session-character.constants';
import { CharacterForm } from '../entities/character-form.entity';
import { CharacterFormSessionSprite } from '../entities/character-form-session-sprite.entity';
import {
  CHARACTER_FORM_SESSION_SPRITE_EVENTS,
  GENERATE_CHARACTER_FORM_SPRITE_JOB,
  GenerateCharacterFormSpritePayload,
} from '../character-form.constants';
import {
  CHARACTER_FORMS_REPOSITORY,
  CharacterFormsRepository,
} from '../repositories/character-forms.repository';
import { CharacterFormSessionSpriteAgent } from './character-form-session-sprite.agent';

export interface FormSpriteView {
  direction: SpriteDirection;
  imageUrl: string | null;
  imageStatus: string;
}

/**
 * Generates and serves the 2.5D SESSION sprites of a character FORM (per facing).
 * Async, riding the ports (image/queue/storage/realtime). Used by the session
 * when the active form changes; no infrastructure is imported into domain code.
 */
@Injectable()
export class CharacterFormSessionSpriteService {
  private readonly logger = new Logger(CharacterFormSessionSpriteService.name);

  constructor(
    @Inject(CHARACTER_FORMS_REPOSITORY)
    private readonly repo: CharacterFormsRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly factions: FactionsService,
    private readonly agent: CharacterFormSessionSpriteAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  /**
   * The current sprite views (per direction) of a form. A sprite left
   * `pending`/`processing` past the staleness window (dead worker, lost job) is
   * reported as `failed` — so clients stop showing an infinite "generating" state
   * and the master can regenerate again.
   */
  async viewsFor(formId: string): Promise<FormSpriteView[]> {
    const sprites = await this.repo.findSpritesByForm(formId);
    return sprites.map((s) => ({
      direction: s.direction,
      imageUrl: s.imageUrl,
      imageStatus:
        (s.imageStatus === 'pending' || s.imageStatus === 'processing') &&
        !imageGenerationInFlight(s.imageStatus, s.updatedAt)
          ? 'failed'
          : s.imageStatus,
    }));
  }

  /**
   * Ensures the form has session sprites in the given directions. Idempotent and
   * defensive (never throws): enqueues generation only for directions that are
   * missing/failed and not already in flight. When `force` is true (explicit
   * "regenerate"), it re-generates even directions that are already completed —
   * WITHOUT clearing the current image, so the old sprite stays visible until the
   * new one is ready. Permission is the caller's job.
   */
  async ensureSprites(
    form: CharacterForm,
    requestedBy: string,
    directions: SpriteDirection[] = [...SPRITE_DIRECTIONS],
    force = false,
  ): Promise<void> {
    for (const direction of directions) {
      try {
        let sprite = await this.repo.findSpriteByFormDirection(form.id, direction);
        if (!sprite) {
          sprite = await this.repo.saveSprite(
            this.repo.createSprite({
              campaignId: form.campaignId,
              characterId: form.characterId,
              characterFormId: form.id,
              direction,
              imageStatus: 'none',
            }),
          );
        }
        if (!force && sprite.imageStatus === 'completed' && sprite.imageUrl) continue;
        if (imageGenerationInFlight(sprite.imageStatus, sprite.updatedAt)) continue;
        await this.startGeneration(sprite, requestedBy);
      } catch (error) {
        this.logger.warn(
          `ensureSprites(${form.id}/${direction}) failed: ${(error as Error).message}`,
        );
      }
    }
  }

  async processSpriteJob(payload: GenerateCharacterFormSpritePayload): Promise<void> {
    const sprite = await this.repo.findSpriteById(payload.spriteId);
    if (!sprite) {
      this.logger.warn(`Form sprite job for missing sprite ${payload.spriteId}`);
      return;
    }
    const form = await this.repo.findById(sprite.characterFormId);
    if (!form) return;
    const character = await this.characters.findInCampaign(sprite.campaignId, sprite.characterId);
    if (!character) return;
    let campaign;
    try {
      campaign = await this.campaigns.findForMasterOrFail(payload.requestedBy, sprite.campaignId);
    } catch {
      this.logger.warn(`Form sprite requester is no longer the master of ${sprite.campaignId}`);
      return;
    }

    sprite.imageStatus = 'processing';
    sprite.imageError = null;
    await this.repo.saveSprite(sprite);
    await this.emit(sprite, CHARACTER_FORM_SESSION_SPRITE_EVENTS.processing, {
      status: 'PROCESSING',
    });

    try {
      const faction = character.factionId
        ? await this.factions.findInCampaign(sprite.campaignId, character.factionId)
        : null;
      const prompt = await this.agent.build(
        {
          theme: campaign.theme,
          tone: campaign.tone,
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: character.name,
          title: character.title,
          shortDescription: character.shortDescription,
        },
        { name: form.name, appearanceDescription: form.appearanceDescription },
        sprite.direction,
        { artDirection: campaign.characterArtDirection, factionName: faction?.name },
      );
      this.logger.log(`Form sprite prompt ${form.id}/${sprite.direction}:\n  ${prompt.imagePrompt}`);

      // Prefer the form's ficha image as reference when i2i is supported.
      const useI2I = this.imageProvider.supportsImageToImage() && !!form.imageUrl;
      const generated = useI2I
        ? await this.imageProvider.editImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            baseImageUrl: form.imageUrl as string,
          })
        : await this.imageProvider.generateImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
          });

      const path = `campaigns/${sprite.campaignId}/characters/${sprite.characterId}/forms/${form.id}/session-sprite/${sprite.direction.toLowerCase()}/${randomUUID()}.png`;
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

      await this.emit(sprite, CHARACTER_FORM_SESSION_SPRITE_EVENTS.completed, {
        status: 'COMPLETED',
        imageUrl: stored.url,
      });
      this.logger.log(`✔ Form sprite done: ${form.id}/${sprite.direction}`);
    } catch (error) {
      const message = (error as Error).message;
      sprite.imageStatus = 'failed';
      sprite.imageError = message;
      await this.repo.saveSprite(sprite);
      await this.emit(sprite, CHARACTER_FORM_SESSION_SPRITE_EVENTS.failed, {
        status: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(`✖ Form sprite failed: ${form.id}/${sprite.direction}: ${message}`);
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  private async startGeneration(
    sprite: CharacterFormSessionSprite,
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
      await this.queue.enqueue<GenerateCharacterFormSpritePayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_CHARACTER_FORM_SPRITE_JOB,
        payload: { spriteId: saved.id, requestedBy },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
    } catch (error) {
      saved.imageStatus = 'failed';
      saved.imageError = (error as Error).message;
      await this.repo.saveSprite(saved);
    }
  }

  private async emit(
    sprite: CharacterFormSessionSprite,
    event: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      tableId: sprite.campaignId,
      characterId: sprite.characterId,
      formId: sprite.characterFormId,
      direction: sprite.direction,
      ...extra,
    };
    try {
      await this.realtime.emitToRoom(characterRoom(sprite.characterId), event, payload);
      await this.realtime.emitToRoom(campaignRoom(sprite.campaignId), event, payload);
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }
}
