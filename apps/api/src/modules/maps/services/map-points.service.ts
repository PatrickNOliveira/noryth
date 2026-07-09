import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CampaignMap } from '../entities/campaign-map.entity';
import { MapPoint } from '../entities/map-point.entity';
import { MapPointDto, toMapPointDto } from '../dto/map.dto';
import { CreateMapPointDto, UpdateMapPointDto } from '../dto/map-point.dto';
import { MAPS_REPOSITORY, MapsRepository } from '../repositories/maps.repository';

/**
 * Application service for map points of interest. Write is master-only; reads
 * follow map + point visibility: players only see visible points of visible
 * maps. Depends only on ports/services — no infrastructure.
 */
@Injectable()
export class MapPointsService {
  constructor(
    @Inject(MAPS_REPOSITORY)
    private readonly maps: MapsRepository,
    private readonly campaigns: CampaignsService,
  ) {}

  async list(
    userId: string,
    campaignId: string,
    mapId: string,
  ): Promise<MapPointDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const map = await this.loadMapOrFail(campaignId, mapId);
    // A private map hides all its points from players (even visible ones).
    if (!isMaster && !map.isVisibleToPlayers) {
      throw new NotFoundException('Mapa não encontrado');
    }
    const points = isMaster
      ? await this.maps.findPointsByMap(map.id)
      : await this.maps.findVisiblePointsByMap(map.id);
    return points.map((p) => toMapPointDto(p, isMaster));
  }

  async create(
    userId: string,
    campaignId: string,
    mapId: string,
    dto: CreateMapPointDto,
  ): Promise<MapPointDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const map = await this.loadMapOrFail(campaignId, mapId);
    const point = await this.maps.savePoint(
      this.maps.createPoint({
        mapId: map.id,
        campaignId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        notes: dto.notes?.trim() ?? '',
        type: dto.type?.trim() ?? '',
        x: dto.x ?? null,
        y: dto.y ?? null,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        showLabelOnMap: dto.showLabelOnMap ?? false,
        displayOrder: dto.displayOrder ?? 0,
      }),
    );
    return toMapPointDto(point, true);
  }

  async update(
    userId: string,
    campaignId: string,
    mapId: string,
    pointId: string,
    dto: UpdateMapPointDto,
  ): Promise<MapPointDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const point = await this.loadPointOrFail(campaignId, mapId, pointId);

    applyIfDefined(point, 'name', dto.name?.trim());
    applyIfDefined(point, 'description', dto.description?.trim());
    applyIfDefined(point, 'notes', dto.notes?.trim());
    applyIfDefined(point, 'type', dto.type?.trim());
    if (dto.x !== undefined) point.x = dto.x;
    if (dto.y !== undefined) point.y = dto.y;
    if (dto.isVisibleToPlayers !== undefined) {
      point.isVisibleToPlayers = dto.isVisibleToPlayers;
    }
    if (dto.showLabelOnMap !== undefined) {
      point.showLabelOnMap = dto.showLabelOnMap;
    }
    if (dto.displayOrder !== undefined) point.displayOrder = dto.displayOrder;

    const saved = await this.maps.savePoint(point);
    return toMapPointDto(saved, true);
  }

  async remove(
    userId: string,
    campaignId: string,
    mapId: string,
    pointId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const point = await this.loadPointOrFail(campaignId, mapId, pointId);
    await this.maps.removePoint(point);
  }

  private async loadMapOrFail(
    campaignId: string,
    mapId: string,
  ): Promise<CampaignMap> {
    const map = await this.maps.findMapById(mapId);
    if (!map || map.campaignId !== campaignId) {
      throw new NotFoundException('Mapa não encontrado');
    }
    return map;
  }

  private async loadPointOrFail(
    campaignId: string,
    mapId: string,
    pointId: string,
  ): Promise<MapPoint> {
    const point = await this.maps.findPointById(pointId);
    if (
      !point ||
      point.mapId !== mapId ||
      point.campaignId !== campaignId
    ) {
      throw new NotFoundException('Ponto de interesse não encontrado');
    }
    return point;
  }
}

function applyIfDefined<K extends keyof MapPoint>(
  entity: MapPoint,
  key: K,
  value: MapPoint[K] | undefined,
): void {
  if (value !== undefined) entity[key] = value;
}
