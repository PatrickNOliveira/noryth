import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IMAGE_GENERATION_STALE_MS } from '@shared/utils/image-generation.util';
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
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { Campaign } from '@modules/campaigns/entities/campaign.entity';
import { Faction } from '../entities/faction.entity';
import { FactionImage } from '../entities/faction-image.entity';
import { CreateFactionDto } from '../dto/create-faction.dto';
import {
  campaignRoom,
  factionRoom,
  FACTION_IMAGE_EVENTS,
  GENERATE_FACTION_SYMBOL_JOB,
  GenerateFactionSymbolPayload,
} from '../faction.constants';
import {
  FACTIONS_REPOSITORY,
  FactionsRepository,
} from '../repositories/factions.repository';
import { FactionSymbolAgent } from './faction-symbol.agent';

/** Faction plus its images (newest-first). */
export interface FactionResult {
  faction: Faction;
  images: FactionImage[];
}

/**
 * Application service for factions. Creation NEVER calls the AI or storage —
 * it records a queued image and enqueues an async job through the QueueProvider
 * abstraction (no BullMQ here). The job is executed later by
 * {@link processGenerationJob}, invoked by the queue worker.
 */
@Injectable()
export class FactionsService {
  private readonly logger = new Logger(FactionsService.name);

  constructor(
    @Inject(FACTIONS_REPOSITORY)
    private readonly factions: FactionsRepository,
    private readonly campaigns: CampaignsService,
    private readonly agent: FactionSymbolAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  async create(
    userId: string,
    campaignId: string,
    dto: CreateFactionDto,
  ): Promise<FactionResult> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const type = dto.type === 'custom' && dto.customType ? dto.customType : dto.type;

    const faction = await this.factions.saveFaction(
      this.factions.createFaction({
        campaignId,
        name: dto.name.trim(),
        type,
        description: dto.description?.trim() ?? '',
        history: dto.history?.trim() ?? '',
        identity: dto.identity?.trim() ?? '',
        memberTraits: dto.memberTraits?.trim() ?? '',
        values: dto.values?.trim() ?? '',
        motto: dto.motto?.trim() ?? '',
        colors: dto.colors?.trim() ?? '',
        recurringElements: dto.recurringElements?.trim() ?? '',
        symbolType: dto.symbolType,
        symbolPrompt: dto.symbolPrompt?.trim() ?? '',
        status: 'generating_symbol',
        createdBy: userId,
        approvedImagePath: null,
        approvedImageUrl: null,
      }),
    );

    const image = await this.newQueuedImage(faction.id, dto.symbolPrompt?.trim());
    await this.enqueueGeneration(faction, image, userId, dto.symbolPrompt?.trim());

    return this.buildResult(faction.id);
  }

  listByCampaign(userId: string, campaignId: string): Promise<Faction[]> {
    return this.campaigns
      .findForMemberOrFail(userId, campaignId)
      .then(() => this.factions.findByCampaign(campaignId));
  }

  async getDetail(
    userId: string,
    campaignId: string,
    factionId: string,
  ): Promise<FactionResult> {
    // Read is open to any participant.
    await this.campaigns.findForMemberOrFail(userId, campaignId);
    const faction = await this.loadFactionOrFail(campaignId, factionId);
    return this.buildResult(faction.id);
  }

  /**
   * Raw lookup (NO permission check) for other modules to validate a link, e.g.
   * a character pointing at a faction. Returns null when it doesn't belong to
   * the campaign.
   */
  async findInCampaign(
    campaignId: string,
    factionId: string,
  ): Promise<Faction | null> {
    const faction = await this.factions.findFactionById(factionId);
    return faction && faction.campaignId === campaignId ? faction : null;
  }

  /** Reject-with-adjustments / retry — also asynchronous. */
  async regenerate(
    userId: string,
    campaignId: string,
    factionId: string,
    notes?: string,
  ): Promise<FactionResult> {
    const faction = await this.getMasterFactionContext(userId, campaignId, factionId);
    // Block re-triggering while a symbol generation is genuinely in flight; a
    // stale one (worker never ran) is allowed through to recover.
    if (
      faction.status === 'generating_symbol' &&
      Date.now() - faction.updatedAt.getTime() < IMAGE_GENERATION_STALE_MS
    ) {
      throw new ConflictException(
        'Uma geração de imagem já está em andamento. Aguarde a conclusão.',
      );
    }
    const image = await this.newQueuedImage(faction.id, notes);
    faction.status = 'generating_symbol';
    await this.factions.saveFaction(faction);
    await this.enqueueGeneration(faction, image, userId, notes);
    return this.buildResult(faction.id);
  }

  async approve(
    userId: string,
    campaignId: string,
    factionId: string,
  ): Promise<FactionResult> {
    const faction = await this.getMasterFactionContext(userId, campaignId, factionId);
    const latest = await this.factions.findLatestImage(faction.id);
    if (!latest || latest.status !== 'completed') {
      throw new BadRequestException('Não há símbolo concluído para aprovar.');
    }
    await this.factions.unapproveAllImages(faction.id);
    latest.status = 'approved';
    latest.isApproved = true;
    await this.factions.saveImage(latest);

    faction.approvedImagePath = latest.imagePath;
    faction.approvedImageUrl = latest.imageUrl;
    faction.status = 'active';
    await this.factions.saveFaction(faction);

    return this.buildResult(faction.id);
  }

  async reject(
    userId: string,
    campaignId: string,
    factionId: string,
  ): Promise<FactionResult> {
    const faction = await this.getMasterFactionContext(userId, campaignId, factionId);
    const latest = await this.factions.findLatestImage(faction.id);
    if (latest) {
      latest.status = 'rejected';
      latest.isApproved = false;
      await this.factions.saveImage(latest);
    }
    faction.status = 'draft';
    await this.factions.saveFaction(faction);
    return this.buildResult(faction.id);
  }

  /**
   * Executed by the queue worker (see FactionSymbolHandler). Does the slow work
   * the HTTP request deliberately avoided: agent → image provider → storage.
   * Throws on failure so BullMQ can retry; state is persisted on every attempt.
   */
  async processGenerationJob(payload: GenerateFactionSymbolPayload): Promise<void> {
    const faction = await this.factions.findFactionById(payload.factionId);
    if (!faction) {
      this.logger.warn(`Job for missing faction ${payload.factionId}`);
      return;
    }

    let campaign: Campaign;
    try {
      campaign = await this.campaigns.findForMasterOrFail(
        payload.requestedBy,
        faction.campaignId,
      );
    } catch {
      this.logger.warn(
        `Job requester is no longer the master of campaign ${faction.campaignId}`,
      );
      return;
    }

    const image = await this.factions.findLatestImage(faction.id);
    if (!image) {
      this.logger.warn(`No image record for faction ${faction.id}`);
      return;
    }

    const startedAt = Date.now();
    this.logger.log(
      `▶ Symbol job start: faction=${faction.id} image=${image.id} type=${faction.symbolType}` +
        `${payload.adjustmentPrompt ? ' (with adjustments)' : ''}`,
    );

    image.status = 'processing';
    await this.factions.saveImage(image);
    await this.emitFactionEvent(faction, FACTION_IMAGE_EVENTS.processing, {
      factionId: faction.id,
      imageStatus: 'PROCESSING',
    });

    try {
      const prompt = await this.agent.build(
        {
          name: campaign.name,
          theme: campaign.theme.replace(/[-_]/g, ' '),
          description: campaign.shortDescription,
          premise: campaign.premise,
          tone: campaign.tone.replace(/[-_]/g, ' '),
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: faction.name,
          type: faction.type,
          description: faction.description,
          history: faction.history,
          identity: faction.identity,
          memberTraits: faction.memberTraits,
          values: faction.values,
          motto: faction.motto,
          colors: faction.colors,
          recurringElements: faction.recurringElements,
          symbolType: faction.symbolType,
          symbolPrompt: faction.symbolPrompt,
        },
        payload.adjustmentPrompt ?? image.notes ?? undefined,
      );
      this.logger.log(
        `Prompt built for faction ${faction.id}; requesting image…\n` +
          `  prompt: ${prompt.imagePrompt}\n` +
          `  negativePrompt: ${prompt.negativePrompt}`,
      );

      const generated = await this.imageProvider.generateImage({
        prompt: prompt.imagePrompt,
        negativePrompt: prompt.negativePrompt,
      });

      const path = `campaigns/${faction.campaignId}/factions/${faction.id}/symbols/${randomUUID()}.png`;
      this.logger.log(`Uploading symbol (${generated.buffer.length} bytes) → ${path}`);
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      image.imagePath = stored.path;
      image.imageUrl = stored.url;
      image.prompt = prompt.imagePrompt;
      image.negativePrompt = prompt.negativePrompt;
      image.status = 'completed';
      image.errorMessage = null;
      await this.factions.saveImage(image);

      faction.status = 'pending_approval';
      await this.factions.saveFaction(faction);

      await this.emitFactionEvent(faction, FACTION_IMAGE_EVENTS.completed, {
        factionId: faction.id,
        imageUrl: stored.url,
        imageStatus: 'COMPLETED',
      });
      this.logger.log(
        `✔ Symbol job done: faction=${faction.id} in ${Date.now() - startedAt}ms → pending_approval`,
      );
    } catch (error) {
      const message = (error as Error).message;
      image.status = 'failed';
      image.errorMessage = message;
      await this.factions.saveImage(image);
      faction.status = 'generation_failed';
      await this.factions.saveFaction(faction);
      this.logger.error(
        `✖ Symbol job failed: faction=${faction.id} in ${Date.now() - startedAt}ms: ${message}`,
      );

      await this.emitFactionEvent(faction, FACTION_IMAGE_EVENTS.failed, {
        factionId: faction.id,
        imageStatus: 'FAILED',
        errorMessage: message,
      });
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  /**
   * Emits a realtime event to the faction and campaign rooms via the
   * RealtimeProvider abstraction. Best-effort: a realtime failure must never
   * break generation. The transport (Socket.IO today) can be swapped freely.
   */
  private async emitFactionEvent(
    faction: Faction,
    event: string,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(factionRoom(faction.id), event, payload);
      await this.realtime.emitToRoom(campaignRoom(faction.campaignId), event, payload);
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }

  private newQueuedImage(factionId: string, notes?: string): Promise<FactionImage> {
    return this.factions.saveImage(
      this.factions.createImage({
        factionId,
        imagePath: null,
        imageUrl: null,
        prompt: null,
        negativePrompt: null,
        notes: notes || null,
        status: 'queued',
        errorMessage: null,
        isApproved: false,
      }),
    );
  }

  private async enqueueGeneration(
    faction: Faction,
    image: FactionImage,
    requestedBy: string,
    adjustmentPrompt?: string,
  ): Promise<void> {
    if (!this.imageProvider.isConfigured()) {
      await this.markFailed(faction, image, 'AI image generation is not configured.');
      return;
    }
    try {
      await this.queue.enqueue<GenerateFactionSymbolPayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_FACTION_SYMBOL_JOB,
        payload: { factionId: faction.id, requestedBy, adjustmentPrompt },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(
        `Enqueued symbol generation: faction=${faction.id} queue=${AI_IMAGE_QUEUE}`,
      );
    } catch (error) {
      await this.markFailed(faction, image, (error as Error).message);
    }
  }

  private async markFailed(
    faction: Faction,
    image: FactionImage,
    message: string,
  ): Promise<void> {
    image.status = 'failed';
    image.errorMessage = message;
    await this.factions.saveImage(image);
    faction.status = 'generation_failed';
    await this.factions.saveFaction(faction);
    this.logger.warn(`Faction ${faction.id} marked generation_failed: ${message}`);
  }

  private async buildResult(factionId: string): Promise<FactionResult> {
    const faction = await this.factions.findFactionById(factionId);
    const images = await this.factions.findImagesByFaction(factionId);
    if (!faction) throw new NotFoundException('Facção não encontrada');
    return { faction, images };
  }

  /** Loads a faction and validates it belongs to the campaign (no auth check). */
  private async loadFactionOrFail(
    campaignId: string,
    factionId: string,
  ): Promise<Faction> {
    const faction = await this.factions.findFactionById(factionId);
    if (!faction || faction.campaignId !== campaignId) {
      throw new NotFoundException('Facção não encontrada');
    }
    return faction;
  }

  /**
   * Loads a faction for a WRITE operation: the caller must be the campaign's
   * current master (owner-only is not enough). Centralized in
   * {@link CampaignsService.findForMasterOrFail}.
   */
  private async getMasterFactionContext(
    userId: string,
    campaignId: string,
    factionId: string,
  ): Promise<Faction> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    return this.loadFactionOrFail(campaignId, factionId);
  }
}
