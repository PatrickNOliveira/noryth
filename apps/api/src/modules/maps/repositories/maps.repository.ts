import { CampaignMap } from '../entities/campaign-map.entity';
import { MapPoint } from '../entities/map-point.entity';

/**
 * Persistence PORT for maps and their points of interest. The service depends
 * on this interface; the TypeORM adapter implements it.
 */
export interface MapsRepository {
  // ── maps ──
  createMap(data: Partial<CampaignMap>): CampaignMap;
  saveMap(map: CampaignMap): Promise<CampaignMap>;
  removeMap(map: CampaignMap): Promise<void>;
  findMapById(id: string): Promise<CampaignMap | null>;
  findByCampaign(campaignId: string): Promise<CampaignMap[]>;
  findVisibleByCampaign(campaignId: string): Promise<CampaignMap[]>;
  countChildren(mapId: string): Promise<number>;

  // ── points of interest ──
  createPoint(data: Partial<MapPoint>): MapPoint;
  savePoint(point: MapPoint): Promise<MapPoint>;
  removePoint(point: MapPoint): Promise<void>;
  findPointById(id: string): Promise<MapPoint | null>;
  findPointsByMap(mapId: string): Promise<MapPoint[]>;
  findVisiblePointsByMap(mapId: string): Promise<MapPoint[]>;
}

/** DI token used to inject a {@link MapsRepository}. */
export const MAPS_REPOSITORY = Symbol('MAPS_REPOSITORY');
