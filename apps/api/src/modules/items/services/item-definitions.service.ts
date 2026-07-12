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
import { ItemDefinition } from '../entities/item-definition.entity';
import {
  ItemDefinitionDto,
  ItemDefinitionListItemDto,
  ItemSessionDetailDto,
  toItemDefinitionDto,
  toItemInstanceDto,
} from '../dto/item.dto';
import { CreateItemDefinitionDto } from '../dto/create-item-definition.dto';
import { UpdateItemDefinitionDto } from '../dto/update-item-definition.dto';
import {
  itemRoom,
  ItemCreationSource,
  ITEM_EVENTS,
  ITEM_IMAGE_EVENTS,
  GENERATE_ITEM_IMAGE_JOB,
  GenerateItemImagePayload,
} from '../item.constants';
import { ITEMS_REPOSITORY, ItemsRepository } from '../repositories/items.repository';
import { ItemImageAgent } from './item-image.agent';

/**
 * Application service for item DEFINITIONS: CRUD, visibility, art direction and
 * async image. Write is master-only; reads are open to participants (players see
 * only visible definitions). Infrastructure sits behind PORTS.
 */
@Injectable()
export class ItemDefinitionsService {
  private readonly logger = new Logger(ItemDefinitionsService.name);

  constructor(
    @Inject(ITEMS_REPOSITORY)
    private readonly items: ItemsRepository,
    private readonly campaigns: CampaignsService,
    private readonly agent: ItemImageAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  async list(userId: string, campaignId: string): Promise<ItemDefinitionDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const list = isMaster
      ? await this.items.findDefinitionsByCampaign(campaignId)
      : await this.items.findVisibleDefinitionsByCampaign(campaignId);
    return list.map((d) => toItemDefinitionDto(d, isMaster));
  }

  /**
   * Master-only campaign items list for the session manager: every definition
   * with its instance count, optionally filtered by a name search. Used by the
   * session "Items" panel.
   */
  async listWithCounts(
    userId: string,
    campaignId: string,
    search?: string,
  ): Promise<ItemDefinitionListItemDto[]> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    let defs = await this.items.findDefinitionsByCampaign(campaignId);
    const term = search?.trim().toLowerCase();
    if (term) {
      defs = defs.filter((d) => d.name.toLowerCase().includes(term));
    }
    const counts = new Map(
      (await this.items.countInstancesByCampaign(campaignId)).map((r) => [
        r.itemDefinitionId,
        r.count,
      ]),
    );
    return defs.map((d) => ({
      ...toItemDefinitionDto(d, true),
      instanceCount: counts.get(d.id) ?? 0,
    }));
  }

  /**
   * Master-only item sheet for the session manager: the definition plus all of
   * its instances (with holder/location/state), so the master can transfer or
   * unassign them.
   */
  async getSessionDetail(
    userId: string,
    campaignId: string,
    definitionId: string,
  ): Promise<ItemSessionDetailDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, definitionId);
    const instances = await this.items.findInstances(campaignId, {
      itemDefinitionId: def.id,
    });
    return {
      definition: toItemDefinitionDto(def, true),
      instances: instances.map((i) => toItemInstanceDto(i, true)),
    };
  }

  async getDetail(
    userId: string,
    campaignId: string,
    definitionId: string,
  ): Promise<ItemDefinitionDto> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const def = await this.loadOrFail(campaignId, definitionId);
    if (!isMaster && !def.isVisibleToPlayers) {
      throw new NotFoundException('Item não encontrado');
    }
    return toItemDefinitionDto(def, isMaster);
  }

  /**
   * Creates an item definition. `origin` records provenance: campaign prep by
   * default, or an item improvised during a live session (audit-only — the item
   * is identical otherwise). Broadcasts `item.created` so watchers' lists update
   * without a refetch.
   */
  async create(
    userId: string,
    campaignId: string,
    dto: CreateItemDefinitionDto,
    origin: {
      creationSource?: ItemCreationSource;
      createdDuringSessionId?: string | null;
    } = {},
  ): Promise<ItemDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    let def = await this.items.saveDefinition(
      this.items.createDefinition({
        campaignId,
        createdByUserId: userId,
        creationSource: origin.creationSource ?? 'PREPARATION',
        createdDuringSessionId: origin.createdDuringSessionId ?? null,
        name: dto.name.trim(),
        type: dto.type?.trim() ?? '',
        shortDescription: dto.shortDescription?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        history: dto.history?.trim() ?? '',
        appearance: dto.appearance?.trim() ?? '',
        effectDescription: dto.effectDescription?.trim() ?? '',
        rulesText: dto.rulesText?.trim() ?? '',
        isUnique: dto.isUnique ?? false,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        masterNotes: dto.masterNotes?.trim() ?? '',
        imageStatus: 'none',
        imagePath: null,
        imageUrl: null,
        imageError: null,
        imageJobId: null,
      }),
    );
    if (dto.generateImage) {
      def = await this.startGeneration(def, userId, {
        ignoreArtDirection: dto.ignoreCampaignArtDirection,
      });
    }

    await this.emit(def, ITEM_EVENTS.created, {
      tableId: def.campaignId,
      itemDefinitionId: def.id,
      createdDuringSessionId: def.createdDuringSessionId,
      originUserId: userId,
    });

    return toItemDefinitionDto(def, true);
  }

  async update(
    userId: string,
    campaignId: string,
    definitionId: string,
    dto: UpdateItemDefinitionDto,
  ): Promise<ItemDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, definitionId);

    applyIfDefined(def, 'name', dto.name?.trim());
    applyIfDefined(def, 'type', dto.type?.trim());
    applyIfDefined(def, 'shortDescription', dto.shortDescription?.trim());
    applyIfDefined(def, 'description', dto.description?.trim());
    applyIfDefined(def, 'history', dto.history?.trim());
    applyIfDefined(def, 'appearance', dto.appearance?.trim());
    applyIfDefined(def, 'effectDescription', dto.effectDescription?.trim());
    applyIfDefined(def, 'rulesText', dto.rulesText?.trim());
    applyIfDefined(def, 'masterNotes', dto.masterNotes?.trim());
    if (dto.isUnique !== undefined) def.isUnique = dto.isUnique;
    if (dto.isVisibleToPlayers !== undefined) {
      def.isVisibleToPlayers = dto.isVisibleToPlayers;
    }

    const saved = await this.items.saveDefinition(def);
    return toItemDefinitionDto(saved, true);
  }

  async remove(
    userId: string,
    campaignId: string,
    definitionId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, definitionId);
    if ((await this.items.countInstancesOfDefinition(def.id)) > 0) {
      throw new ConflictException(
        'Este item possui instâncias na campanha. Remova as instâncias antes de apagar a definição.',
      );
    }
    await this.items.removeDefinition(def);
  }

  async generateImage(
    userId: string,
    campaignId: string,
    definitionId: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean } = {},
  ): Promise<ItemDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    let def = await this.loadOrFail(campaignId, definitionId);
    def = await this.startGeneration(def, userId, options);
    return toItemDefinitionDto(def, true);
  }

  // ── item art direction (master only) ────────────────────────

  async getArtDirection(userId: string, campaignId: string): Promise<string> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    return campaign.itemArtDirection ?? '';
  }

  async setArtDirection(
    userId: string,
    campaignId: string,
    value: string,
  ): Promise<string> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    const saved = await this.campaigns.saveItemArtDirection(campaign, value.trim());
    return saved.itemArtDirection;
  }

  // ── async worker ────────────────────────────────────────────

  async processGenerationJob(payload: GenerateItemImagePayload): Promise<void> {
    const def = await this.items.findDefinitionById(payload.itemDefinitionId);
    if (!def) {
      this.logger.warn(`Job for missing item ${payload.itemDefinitionId}`);
      return;
    }

    let campaign;
    try {
      campaign = await this.campaigns.findForMasterOrFail(
        payload.requestedBy,
        def.campaignId,
      );
    } catch {
      this.logger.warn(
        `Job requester is no longer the master of campaign ${def.campaignId}`,
      );
      return;
    }

    const startedAt = Date.now();
    def.imageStatus = 'processing';
    def.imageError = null;
    await this.items.saveDefinition(def);
    await this.emit(def, ITEM_IMAGE_EVENTS.processing, {
      tableId: def.campaignId,
      itemDefinitionId: def.id,
      imageStatus: 'PROCESSING',
    });

    try {
      const prompt = await this.agent.build(
        {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: def.name,
          type: def.type,
          shortDescription: def.shortDescription,
          description: def.description,
          history: def.history,
          appearance: def.appearance,
          effectDescription: def.effectDescription,
        },
        {
          artDirection: campaign.itemArtDirection,
          adjustments: payload.adjustments,
          ignoreArtDirection: payload.ignoreArtDirection,
        },
      );
      this.logger.log(`Item prompt for item ${def.id}:\n  prompt: ${prompt.imagePrompt}`);

      const useI2I =
        this.imageProvider.supportsImageToImage() &&
        !!def.imageUrl &&
        !!payload.adjustments;
      const generated = useI2I
        ? await this.imageProvider.editImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            baseImageUrl: def.imageUrl as string,
          })
        : await this.imageProvider.generateImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
          });

      const path = `campaigns/${def.campaignId}/items/${def.id}/image/${randomUUID()}.png`;
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      def.imagePath = stored.path;
      def.imageUrl = stored.url;
      def.imageStatus = 'completed';
      def.imageError = null;
      def.lastImagePrompt = prompt.imagePrompt;
      def.lastImageNegativePrompt = prompt.negativePrompt;
      def.lastImageAdjustment = payload.adjustments ?? def.lastImageAdjustment;
      await this.items.saveDefinition(def);

      await this.emit(def, ITEM_IMAGE_EVENTS.completed, {
        tableId: def.campaignId,
        itemDefinitionId: def.id,
        imageStatus: 'COMPLETED',
        imageUrl: stored.url,
      });
      this.logger.log(`✔ Item image done: item=${def.id} in ${Date.now() - startedAt}ms`);
    } catch (error) {
      const message = (error as Error).message;
      def.imageStatus = 'failed';
      def.imageError = message;
      await this.items.saveDefinition(def);
      await this.emit(def, ITEM_IMAGE_EVENTS.failed, {
        tableId: def.campaignId,
        itemDefinitionId: def.id,
        imageStatus: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(`✖ Item image failed: item=${def.id}: ${message}`);
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  private async startGeneration(
    def: ItemDefinition,
    requestedBy: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean } = {},
  ): Promise<ItemDefinition> {
    if (imageGenerationInFlight(def.imageStatus, def.updatedAt)) {
      throw new ConflictException(
        'Uma geração de imagem já está em andamento. Aguarde a conclusão.',
      );
    }
    if (!this.imageProvider.isConfigured()) {
      def.imageStatus = 'failed';
      def.imageError = 'Geração de imagem por IA não está configurada.';
      return this.items.saveDefinition(def);
    }
    const adjustments = options.adjustments?.trim() || undefined;
    def.imageStatus = 'pending';
    def.imageError = null;
    def.lastImageAdjustment = adjustments ?? null;
    const saved = await this.items.saveDefinition(def);
    try {
      await this.queue.enqueue<GenerateItemImagePayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_ITEM_IMAGE_JOB,
        payload: {
          itemDefinitionId: saved.id,
          requestedBy,
          adjustments,
          ignoreArtDirection: options.ignoreArtDirection || undefined,
        },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(`Enqueued item image generation: item=${saved.id}`);
    } catch (error) {
      saved.imageStatus = 'failed';
      saved.imageError = (error as Error).message;
      return this.items.saveDefinition(saved);
    }
    return saved;
  }

  private async emit(
    def: ItemDefinition,
    event: string,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(itemRoom(def.id), event, payload);
      await this.realtime.emitToRoom(campaignRoom(def.campaignId), event, payload);
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }

  private async loadOrFail(
    campaignId: string,
    definitionId: string,
  ): Promise<ItemDefinition> {
    const def = await this.items.findDefinitionById(definitionId);
    if (!def || def.campaignId !== campaignId) {
      throw new NotFoundException('Item não encontrado');
    }
    return def;
  }
}

function applyIfDefined<K extends keyof ItemDefinition>(
  entity: ItemDefinition,
  key: K,
  value: ItemDefinition[K] | undefined,
): void {
  if (value !== undefined) entity[key] = value;
}
