import { CampaignMap } from '../entities/campaign-map.entity';
import { MapPoint } from '../entities/map-point.entity';

export interface MapPointDto {
  id: string;
  mapId: string;
  name: string;
  description: string;
  /** Master-only; null for players. */
  notes: string | null;
  type: string;
  x: number | null;
  y: number | null;
  /** Position on the 2.5D session scene (null = fall back to x/y). */
  sceneX: number | null;
  sceneY: number | null;
  isVisibleToPlayers: boolean;
  showLabelOnMap: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MapDto {
  id: string;
  campaignId: string;
  parentMapId: string | null;
  createdByUserId: string;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  /** Master-only; null for players. */
  notes: string | null;
  /** Master-only; null for players. */
  artDirection: string | null;
  isVisibleToPlayers: boolean;
  imageUrl: string | null;
  imageStatus: string;
  imageError: string | null;
  /** 2.5D session-scene asset (game viewport); distinct from the map image. */
  sessionSceneImageUrl: string | null;
  sessionSceneImageStatus: string;
  sessionSceneImageError: string | null;
  displayOrder: number;
  /** Present on the detail view. */
  points?: MapPointDto[];
  createdAt: Date;
  updatedAt: Date;
}

export function toMapPointDto(
  point: MapPoint,
  includePrivate: boolean,
): MapPointDto {
  return {
    id: point.id,
    mapId: point.mapId,
    name: point.name,
    description: point.description,
    notes: includePrivate ? point.notes : null,
    type: point.type,
    x: point.x,
    y: point.y,
    sceneX: point.sceneX,
    sceneY: point.sceneY,
    isVisibleToPlayers: point.isVisibleToPlayers,
    showLabelOnMap: point.showLabelOnMap,
    displayOrder: point.displayOrder,
    createdAt: point.createdAt,
    updatedAt: point.updatedAt,
  };
}

/** @param includePrivate whether the viewer is the master. */
export function toMapDto(
  map: CampaignMap,
  includePrivate: boolean,
  points?: MapPoint[],
): MapDto {
  return {
    id: map.id,
    campaignId: map.campaignId,
    parentMapId: map.parentMapId,
    createdByUserId: map.createdByUserId,
    name: map.name,
    type: map.type,
    shortDescription: map.shortDescription,
    description: map.description,
    history: map.history,
    notes: includePrivate ? map.notes : null,
    artDirection: includePrivate ? map.artDirection : null,
    isVisibleToPlayers: map.isVisibleToPlayers,
    imageUrl: map.imageUrl,
    imageStatus: map.imageStatus,
    imageError: map.imageError,
    sessionSceneImageUrl: map.sessionSceneImageUrl,
    sessionSceneImageStatus: map.sessionSceneImageStatus,
    sessionSceneImageError: map.sessionSceneImageError,
    displayOrder: map.displayOrder,
    points: points?.map((p) => toMapPointDto(p, includePrivate)),
    createdAt: map.createdAt,
    updatedAt: map.updatedAt,
  };
}
