import { randomUUID } from 'crypto';
import {
  ConflictException,
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
import { characterRoom } from '@modules/characters/character.constants';
import { FactionsService } from '@modules/factions/services/factions.service';
import { CharacterForm } from '../entities/character-form.entity';
import { CharacterFormDto, toCharacterFormDto } from '../dto/character-form.dto';
import {
  CHARACTER_FORM_IMAGE_EVENTS,
  GENERATE_CHARACTER_FORM_IMAGE_JOB,
  GenerateCharacterFormImagePayload,
} from '../character-form.constants';
import {
  CHARACTER_FORMS_REPOSITORY,
  CharacterFormsRepository,
} from '../repositories/character-forms.repository';
import { CharacterFormService } from './character-form.service';
import { CharacterFormImageAgent } from './character-form-image.agent';

/**
 * Async AI-image generation for a character's FORM (preparation/sheet only — NOT
 * a session sprite). Rides the shared image queue and the image/storage/realtime
 * PORTS; no infrastructure is imported into domain code.
 */
@Injectable()
export class CharacterFormImageService {
  private readonly logger = new Logger(CharacterFormImageService.name);

  constructor(
    @Inject(CHARACTER_FORMS_REPOSITORY)
    private readonly forms: CharacterFormsRepository,
    private readonly formService: CharacterFormService,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly factions: FactionsService,
    private readonly agent: CharacterFormImageAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  async generate(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean } = {},
  ): Promise<CharacterFormDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const form = await this.formService.loadFormForImage(characterId, formId);
    const started = await this.startGeneration(form, userId, options);
    const [values, abilities] = await Promise.all([
      this.forms.findValues(started.id),
      this.forms.findAbilities(started.id),
    ]);
    return toCharacterFormDto(started, values, abilities);
  }

  async processFormImageJob(
    payload: GenerateCharacterFormImagePayload,
  ): Promise<void> {
    const form = await this.forms.findById(payload.formId);
    if (!form) {
      this.logger.warn(`Form image job for missing form ${payload.formId}`);
      return;
    }
    let campaign;
    try {
      campaign = await this.campaigns.findForMasterOrFail(payload.requestedBy, form.campaignId);
    } catch {
      this.logger.warn(`Form image requester is no longer the master of ${form.campaignId}`);
      return;
    }
    const character = await this.characters.findInCampaign(form.campaignId, form.characterId);
    if (!character) {
      this.logger.warn(`Form image job for missing character ${form.characterId}`);
      return;
    }

    form.imageStatus = 'processing';
    form.imageError = null;
    await this.forms.save(form);
    await this.emit(form, CHARACTER_FORM_IMAGE_EVENTS.processing, { status: 'PROCESSING' });

    try {
      const faction = character.factionId
        ? await this.factions.findInCampaign(form.campaignId, character.factionId)
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
        },
        {
          name: form.name,
          shortDescription: form.shortDescription,
          appearanceDescription: form.appearanceDescription,
        },
        faction
          ? {
              name: faction.name,
              identity: faction.identity,
              memberTraits: faction.memberTraits,
              colors: faction.colors,
              recurringElements: faction.recurringElements,
            }
          : undefined,
        {
          artDirection: campaign.characterArtDirection,
          adjustments: payload.adjustments,
          ignoreArtDirection: payload.ignoreArtDirection,
        },
      );
      this.logger.log(`Form prompt for form ${form.id}:\n  prompt: ${prompt.imagePrompt}`);

      const useI2I =
        this.imageProvider.supportsImageToImage() &&
        !!form.imageUrl &&
        !!payload.adjustments;
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

      const path = `campaigns/${form.campaignId}/characters/${form.characterId}/forms/${form.id}/${randomUUID()}.png`;
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      form.imagePath = stored.path;
      form.imageUrl = stored.url;
      form.imageStatus = 'completed';
      form.imageError = null;
      form.lastImagePrompt = prompt.imagePrompt;
      form.lastImageNegativePrompt = prompt.negativePrompt;
      await this.forms.save(form);

      await this.emit(form, CHARACTER_FORM_IMAGE_EVENTS.completed, {
        status: 'COMPLETED',
        imageUrl: stored.url,
      });
      this.logger.log(`✔ Form image done: form=${form.id}`);
    } catch (error) {
      const message = (error as Error).message;
      form.imageStatus = 'failed';
      form.imageError = message;
      await this.forms.save(form);
      await this.emit(form, CHARACTER_FORM_IMAGE_EVENTS.failed, {
        status: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(`✖ Form image failed: form=${form.id}: ${message}`);
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  private async startGeneration(
    form: CharacterForm,
    requestedBy: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean },
  ): Promise<CharacterForm> {
    if (imageGenerationInFlight(form.imageStatus, form.updatedAt)) {
      throw new ConflictException(
        'Uma geração de imagem já está em andamento. Aguarde a conclusão.',
      );
    }
    if (!this.imageProvider.isConfigured()) {
      form.imageStatus = 'failed';
      form.imageError = 'Geração de imagem por IA não está configurada.';
      return this.forms.save(form);
    }
    const adjustments = options.adjustments?.trim() || undefined;
    form.imageStatus = 'pending';
    form.imageError = null;
    const saved = await this.forms.save(form);
    try {
      await this.queue.enqueue<GenerateCharacterFormImagePayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_CHARACTER_FORM_IMAGE_JOB,
        payload: {
          formId: saved.id,
          requestedBy,
          adjustments,
          ignoreArtDirection: options.ignoreArtDirection || undefined,
        },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(`Enqueued form image generation: form=${saved.id}`);
    } catch (error) {
      saved.imageStatus = 'failed';
      saved.imageError = (error as Error).message;
      return this.forms.save(saved);
    }
    return saved;
  }

  private async emit(
    form: CharacterForm,
    event: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      tableId: form.campaignId,
      characterId: form.characterId,
      formId: form.id,
      ...extra,
    };
    try {
      await this.realtime.emitToRoom(characterRoom(form.characterId), event, payload);
      await this.realtime.emitToRoom(campaignRoom(form.campaignId), event, payload);
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }
}
