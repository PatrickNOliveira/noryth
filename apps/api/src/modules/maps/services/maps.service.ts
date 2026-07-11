import { randomUUID } from 'crypto';
import {
  BadRequestException,
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
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { imageGenerationInFlight } from '@shared/utils/image-generation.util';
import { CampaignMap } from '../entities/campaign-map.entity';
import { MapDto, toMapDto } from '../dto/map.dto';
import { CreateMapDto } from '../dto/create-map.dto';
import { UpdateMapDto } from '../dto/update-map.dto';
import {
  mapRoom,
  MAP_IMAGE_EVENTS,
  MAP_SESSION_SCENE_EVENTS,
  GENERATE_MAP_IMAGE_JOB,
  GENERATE_MAP_SESSION_SCENE_JOB,
  GenerateMapImagePayload,
  GenerateMapSessionScenePayload,
} from '../map.constants';
import { MAPS_REPOSITORY, MapsRepository } from '../repositories/maps.repository';
import { MapImageAgent } from './map-image.agent';
import { MapSessionSceneAgent } from './map-session-scene.agent';

/**
 * Application service for campaign maps: CRUD, hierarchy (with cycle guards),
 * visibility, art direction and async image generation. Write is master-only
 * (delegated to {@link CampaignsService.findForMasterOrFail}); reads are open to
 * participants, players seeing only visible maps. All infrastructure sits behind
 * PORTS — no BullMQ/OpenAI/MinIO/Socket.IO here.
 */
@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(
    @Inject(MAPS_REPOSITORY)
    private readonly maps: MapsRepository,
    private readonly campaigns: CampaignsService,
    private readonly agent: MapImageAgent,
    private readonly sceneAgent: MapSessionSceneAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  // ── reads ───────────────────────────────────────────────────

  async list(userId: string, campaignId: string): Promise<MapDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const list = isMaster
      ? await this.maps.findByCampaign(campaignId)
      : await this.maps.findVisibleByCampaign(campaignId);
    return list.map((m) => toMapDto(m, isMaster));
  }

  async getDetail(
    userId: string,
    campaignId: string,
    mapId: string,
  ): Promise<MapDto> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const map = await this.loadOrFail(campaignId, mapId);
    if (!isMaster && !map.isVisibleToPlayers) {
      throw new NotFoundException('Mapa não encontrado');
    }
    const points = isMaster
      ? await this.maps.findPointsByMap(map.id)
      : await this.maps.findVisiblePointsByMap(map.id);
    return toMapDto(map, isMaster, points);
  }

  // ── writes (master only) ────────────────────────────────────

  async create(
    userId: string,
    campaignId: string,
    dto: CreateMapDto,
  ): Promise<MapDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    await this.assertParentValid(campaignId, dto.parentMapId ?? null);

    let map = await this.maps.saveMap(
      this.maps.createMap({
        campaignId,
        parentMapId: dto.parentMapId ?? null,
        createdByUserId: userId,
        name: dto.name.trim(),
        type: dto.type?.trim() ?? '',
        shortDescription: dto.shortDescription?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        history: dto.history?.trim() ?? '',
        notes: dto.notes?.trim() ?? '',
        artDirection: dto.artDirection?.trim() ?? '',
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        imageStatus: 'none',
        imagePath: null,
        imageUrl: null,
        imageError: null,
        imageJobId: null,
      }),
    );

    if (dto.generateImage) {
      map = await this.startGeneration(map, userId, {
        ignoreArtDirection: dto.ignoreCampaignArtDirection,
        includeLabels: dto.includeLabels,
      });
    }
    return toMapDto(map, true);
  }

  async update(
    userId: string,
    campaignId: string,
    mapId: string,
    dto: UpdateMapDto,
  ): Promise<MapDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const map = await this.loadOrFail(campaignId, mapId);

    if (dto.parentMapId !== undefined) {
      await this.assertParentValid(campaignId, dto.parentMapId, map.id);
      map.parentMapId = dto.parentMapId;
    }
    applyIfDefined(map, 'name', dto.name?.trim());
    applyIfDefined(map, 'type', dto.type?.trim());
    applyIfDefined(map, 'shortDescription', dto.shortDescription?.trim());
    applyIfDefined(map, 'description', dto.description?.trim());
    applyIfDefined(map, 'history', dto.history?.trim());
    applyIfDefined(map, 'notes', dto.notes?.trim());
    applyIfDefined(map, 'artDirection', dto.artDirection?.trim());
    if (dto.isVisibleToPlayers !== undefined) {
      map.isVisibleToPlayers = dto.isVisibleToPlayers;
    }
    if (dto.displayOrder !== undefined) map.displayOrder = dto.displayOrder;

    const saved = await this.maps.saveMap(map);
    return toMapDto(saved, true);
  }

  async remove(
    userId: string,
    campaignId: string,
    mapId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const map = await this.loadOrFail(campaignId, mapId);
    if ((await this.maps.countChildren(map.id)) > 0) {
      throw new ConflictException(
        'Este mapa possui submapas. Remova ou mova os submapas antes de apagar.',
      );
    }
    await this.maps.removeMap(map);
  }

  async generateImage(
    userId: string,
    campaignId: string,
    mapId: string,
    options: {
      adjustments?: string;
      ignoreArtDirection?: boolean;
      includeLabels?: boolean;
    } = {},
  ): Promise<MapDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    let map = await this.loadOrFail(campaignId, mapId);
    map = await this.startGeneration(map, userId, options);
    const points = await this.maps.findPointsByMap(map.id);
    return toMapDto(map, true, points);
  }

  // ── session scene (2.5D game viewport asset) ────────────────

  /**
   * Master-triggered generation of the map's 2.5D session scene. Explicit entry
   * point (e.g. a retry button, or preparing before starting the session).
   */
  async generateSessionScene(
    userId: string,
    campaignId: string,
    mapId: string,
    options: { adjustments?: string } = {},
  ): Promise<MapDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    let map = await this.loadOrFail(campaignId, mapId);
    map = await this.startSessionSceneGeneration(map, userId, options);
    const points = await this.maps.findPointsByMap(map.id);
    return toMapDto(map, true, points);
  }

  /**
   * Ensures the map has a session scene when a session starts. Idempotent and
   * defensive (never throws): if a scene is already completed or a generation is
   * in flight, it does nothing; otherwise it enqueues one. Called by the sessions
   * module — permission is the caller's responsibility (only the master starts a
   * session), so this does not re-check it.
   */
  async ensureSessionScene(
    campaignId: string,
    mapId: string,
    requestedBy: string,
  ): Promise<void> {
    try {
      const map = await this.findMapInCampaign(campaignId, mapId);
      if (!map) return;
      if (map.sessionSceneImageStatus === 'completed' && map.sessionSceneImageUrl) {
        return;
      }
      if (imageGenerationInFlight(map.sessionSceneImageStatus, map.updatedAt)) {
        return;
      }
      await this.startSessionSceneGeneration(map, requestedBy, {});
    } catch (error) {
      // A scene is a nice-to-have for the session; never block the start on it.
      this.logger.warn(
        `ensureSessionScene failed for map ${mapId}: ${(error as Error).message}`,
      );
    }
  }

  /** Raw lookup (NO permission) of a map in a campaign, for other modules. */
  async findMapInCampaign(
    campaignId: string,
    mapId: string,
  ): Promise<CampaignMap | null> {
    const map = await this.maps.findMapById(mapId);
    return map && map.campaignId === campaignId ? map : null;
  }

  /** Raw lookup (NO permission) of a map point in a campaign, for other modules. */
  async findPointInCampaign(campaignId: string, pointId: string) {
    const point = await this.maps.findPointById(pointId);
    return point && point.campaignId === campaignId ? point : null;
  }

  /**
   * Points of a map for another module (NO permission). `includeHidden` returns
   * every point (master view); otherwise only player-visible ones. Used by the
   * session viewport to place points of interest.
   */
  async findPointsForMap(mapId: string, includeHidden: boolean) {
    return includeHidden
      ? this.maps.findPointsByMap(mapId)
      : this.maps.findVisiblePointsByMap(mapId);
  }

  // ── global map art direction (master only) ──────────────────

  async getArtDirection(userId: string, campaignId: string): Promise<string> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    return campaign.mapArtDirection ?? '';
  }

  async setArtDirection(
    userId: string,
    campaignId: string,
    value: string,
  ): Promise<string> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    const saved = await this.campaigns.saveMapArtDirection(campaign, value.trim());
    return saved.mapArtDirection;
  }

  // ── async worker ────────────────────────────────────────────

  async processGenerationJob(payload: GenerateMapImagePayload): Promise<void> {
    const map = await this.maps.findMapById(payload.mapId);
    if (!map) {
      this.logger.warn(`Job for missing map ${payload.mapId}`);
      return;
    }

    let campaign;
    try {
      campaign = await this.campaigns.findForMasterOrFail(
        payload.requestedBy,
        map.campaignId,
      );
    } catch {
      this.logger.warn(
        `Job requester is no longer the master of campaign ${map.campaignId}`,
      );
      return;
    }

    const startedAt = Date.now();
    map.imageStatus = 'processing';
    map.imageError = null;
    await this.maps.saveMap(map);
    await this.emit(map, MAP_IMAGE_EVENTS.processing, {
      tableId: map.campaignId,
      mapId: map.id,
      imageStatus: 'PROCESSING',
    });

    try {
      const parent = map.parentMapId
        ? await this.maps.findMapById(map.parentMapId)
        : null;

      const prompt = await this.agent.build(
        {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: map.name,
          type: map.type,
          shortDescription: map.shortDescription,
          description: map.description,
          history: map.history,
          artDirection: map.artDirection,
        },
        parent ? { name: parent.name, type: parent.type } : undefined,
        {
          globalArtDirection: campaign.mapArtDirection,
          adjustments: payload.adjustments,
          ignoreArtDirection: payload.ignoreArtDirection,
          includeLabels: payload.includeLabels,
        },
      );
      this.logger.log(`Map prompt for map ${map.id}:\n  prompt: ${prompt.imagePrompt}`);

      const useI2I =
        this.imageProvider.supportsImageToImage() &&
        !!map.imageUrl &&
        !!payload.adjustments;
      const generated = useI2I
        ? await this.imageProvider.editImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            baseImageUrl: map.imageUrl as string,
          })
        : await this.imageProvider.generateImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
          });

      const path = `campaigns/${map.campaignId}/maps/${map.id}/image/${randomUUID()}.png`;
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      map.imagePath = stored.path;
      map.imageUrl = stored.url;
      map.imageStatus = 'completed';
      map.imageError = null;
      map.lastImagePrompt = prompt.imagePrompt;
      map.lastImageNegativePrompt = prompt.negativePrompt;
      map.lastImageAdjustment = payload.adjustments ?? map.lastImageAdjustment;
      await this.maps.saveMap(map);

      await this.emit(map, MAP_IMAGE_EVENTS.completed, {
        tableId: map.campaignId,
        mapId: map.id,
        imageStatus: 'COMPLETED',
        imageUrl: stored.url,
      });
      this.logger.log(`✔ Map image done: map=${map.id} in ${Date.now() - startedAt}ms`);
    } catch (error) {
      const message = (error as Error).message;
      map.imageStatus = 'failed';
      map.imageError = message;
      await this.maps.saveMap(map);
      await this.emit(map, MAP_IMAGE_EVENTS.failed, {
        tableId: map.campaignId,
        mapId: map.id,
        imageStatus: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(`✖ Map image failed: map=${map.id}: ${message}`);
      throw error;
    }
  }

  async processSessionSceneJob(
    payload: GenerateMapSessionScenePayload,
  ): Promise<void> {
    const map = await this.maps.findMapById(payload.mapId);
    if (!map) {
      this.logger.warn(`Session-scene job for missing map ${payload.mapId}`);
      return;
    }

    let campaign;
    try {
      campaign = await this.campaigns.findForMasterOrFail(
        payload.requestedBy,
        map.campaignId,
      );
    } catch {
      this.logger.warn(
        `Session-scene requester is no longer the master of campaign ${map.campaignId}`,
      );
      return;
    }

    const startedAt = Date.now();
    map.sessionSceneImageStatus = 'processing';
    map.sessionSceneImageError = null;
    await this.maps.saveMap(map);
    await this.emitScene(map, MAP_SESSION_SCENE_EVENTS.processing, {
      status: 'PROCESSING',
    });

    try {
      const points = await this.maps.findPointsByMap(map.id);
      const prompt = await this.sceneAgent.build(
        {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: map.name,
          type: map.type,
          shortDescription: map.shortDescription,
          description: map.description,
          history: map.history,
          artDirection: map.artDirection,
        },
        {
          globalArtDirection: campaign.mapArtDirection,
          adjustments: payload.adjustments,
          points: points.map((p) => ({ name: p.name, type: p.type })),
        },
      );
      this.logger.log(
        `Session-scene prompt for map ${map.id}:\n  prompt: ${prompt.imagePrompt}`,
      );

      // The session scene must be WIDESCREEN to match the desktop game viewport
      // (a square image would leave big side borders). The adapter picks a valid
      // landscape size for its model.
      const size = this.imageProvider.landscapeSize();

      // Prefer image-to-image from the original map when supported, so the scene
      // stays faithful to the existing cartography; otherwise text-only.
      const useI2I =
        this.imageProvider.supportsImageToImage() && !!map.imageUrl;
      const generated = useI2I
        ? await this.imageProvider.editImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            baseImageUrl: map.imageUrl as string,
            size,
          })
        : await this.imageProvider.generateImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            size,
          });

      const path = `campaigns/${map.campaignId}/maps/${map.id}/session-scene/${randomUUID()}.png`;
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      map.sessionSceneImagePath = stored.path;
      map.sessionSceneImageUrl = stored.url;
      map.sessionSceneImageStatus = 'completed';
      map.sessionSceneImageError = null;
      map.lastSessionScenePrompt = prompt.imagePrompt;
      map.lastSessionSceneNegativePrompt = prompt.negativePrompt;
      await this.maps.saveMap(map);

      await this.emitScene(map, MAP_SESSION_SCENE_EVENTS.completed, {
        status: 'COMPLETED',
        sessionSceneImageUrl: stored.url,
      });
      this.logger.log(
        `✔ Session scene done: map=${map.id} in ${Date.now() - startedAt}ms`,
      );
    } catch (error) {
      const message = (error as Error).message;
      map.sessionSceneImageStatus = 'failed';
      map.sessionSceneImageError = message;
      await this.maps.saveMap(map);
      await this.emitScene(map, MAP_SESSION_SCENE_EVENTS.failed, {
        status: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(`✖ Session scene failed: map=${map.id}: ${message}`);
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  private async startSessionSceneGeneration(
    map: CampaignMap,
    requestedBy: string,
    options: { adjustments?: string },
  ): Promise<CampaignMap> {
    if (
      imageGenerationInFlight(map.sessionSceneImageStatus, map.updatedAt)
    ) {
      throw new ConflictException(
        'A cena da sessão já está sendo gerada. Aguarde a conclusão.',
      );
    }
    if (!this.imageProvider.isConfigured()) {
      map.sessionSceneImageStatus = 'failed';
      map.sessionSceneImageError =
        'Geração de imagem por IA não está configurada.';
      return this.maps.saveMap(map);
    }
    const adjustments = options.adjustments?.trim() || undefined;
    map.sessionSceneImageStatus = 'pending';
    map.sessionSceneImageError = null;
    const saved = await this.maps.saveMap(map);
    try {
      await this.queue.enqueue<GenerateMapSessionScenePayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_MAP_SESSION_SCENE_JOB,
        payload: { mapId: saved.id, requestedBy, adjustments },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(`Enqueued session-scene generation: map=${saved.id}`);
    } catch (error) {
      saved.sessionSceneImageStatus = 'failed';
      saved.sessionSceneImageError = (error as Error).message;
      return this.maps.saveMap(saved);
    }
    return saved;
  }

  private async startGeneration(
    map: CampaignMap,
    requestedBy: string,
    options: {
      adjustments?: string;
      ignoreArtDirection?: boolean;
      includeLabels?: boolean;
    } = {},
  ): Promise<CampaignMap> {
    if (imageGenerationInFlight(map.imageStatus, map.updatedAt)) {
      throw new ConflictException(
        'Uma geração de imagem já está em andamento. Aguarde a conclusão.',
      );
    }
    if (!this.imageProvider.isConfigured()) {
      map.imageStatus = 'failed';
      map.imageError = 'Geração de imagem por IA não está configurada.';
      return this.maps.saveMap(map);
    }
    const adjustments = options.adjustments?.trim() || undefined;
    map.imageStatus = 'pending';
    map.imageError = null;
    map.lastImageAdjustment = adjustments ?? null;
    const saved = await this.maps.saveMap(map);
    try {
      await this.queue.enqueue<GenerateMapImagePayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_MAP_IMAGE_JOB,
        payload: {
          mapId: saved.id,
          requestedBy,
          adjustments,
          ignoreArtDirection: options.ignoreArtDirection || undefined,
          includeLabels: options.includeLabels || undefined,
        },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(`Enqueued map image generation: map=${saved.id}`);
    } catch (error) {
      saved.imageStatus = 'failed';
      saved.imageError = (error as Error).message;
      return this.maps.saveMap(saved);
    }
    return saved;
  }

  private async emit(
    map: CampaignMap,
    event: string,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(mapRoom(map.id), event, payload);
      await this.realtime.emitToRoom(campaignRoom(map.campaignId), event, payload);
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }

  /** Emits a session-scene event to the map and campaign rooms. */
  private async emitScene(
    map: CampaignMap,
    event: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    await this.emit(map, event, {
      tableId: map.campaignId,
      mapId: map.id,
      ...extra,
    });
  }

  private async loadOrFail(
    campaignId: string,
    mapId: string,
  ): Promise<CampaignMap> {
    const map = await this.maps.findMapById(mapId);
    if (!map || map.campaignId !== campaignId) {
      throw new NotFoundException('Mapa não encontrado');
    }
    return map;
  }

  /**
   * Validates a parent link: same campaign, not self, and no cycle (the parent
   * must not be a descendant of the map being updated).
   */
  private async assertParentValid(
    campaignId: string,
    parentMapId: string | null,
    selfId?: string,
  ): Promise<void> {
    if (!parentMapId) return;
    if (selfId && parentMapId === selfId) {
      throw new BadRequestException('Um mapa não pode ser pai de si mesmo.');
    }
    let current: string | null = parentMapId;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current)) break; // defensive: pre-existing loop
      visited.add(current);
      const node: CampaignMap | null = await this.maps.findMapById(current);
      if (!node || node.campaignId !== campaignId) {
        throw new BadRequestException(
          'O mapa pai precisa pertencer a esta campanha.',
        );
      }
      if (selfId && node.id === selfId) {
        throw new BadRequestException(
          'Hierarquia inválida: isso criaria um ciclo entre os mapas.',
        );
      }
      current = node.parentMapId;
    }
  }
}

/** Assigns `value` to `key` only when it is not undefined. */
function applyIfDefined<K extends keyof CampaignMap>(
  entity: CampaignMap,
  key: K,
  value: CampaignMap[K] | undefined,
): void {
  if (value !== undefined) entity[key] = value;
}
