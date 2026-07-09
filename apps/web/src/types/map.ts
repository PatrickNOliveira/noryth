export type MapImageStatus =
  | 'none'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export const MAP_TYPES = [
  'WORLD',
  'CONTINENT',
  'KINGDOM',
  'REGION',
  'CITY',
  'DISTRICT',
  'BUILDING',
  'DUNGEON',
  'ROOM',
  'BATTLEFIELD',
  'OTHER',
] as const;

export interface MapPoint {
  id: string;
  mapId: string;
  name: string;
  description: string;
  /** Master-only; null for players. */
  notes: string | null;
  type: string;
  x: number | null;
  y: number | null;
  isVisibleToPlayers: boolean;
  showLabelOnMap: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMap {
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
  imageStatus: MapImageStatus;
  imageError: string | null;
  displayOrder: number;
  points?: MapPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMapInput {
  name: string;
  type?: string;
  parentMapId?: string | null;
  shortDescription?: string;
  description?: string;
  history?: string;
  notes?: string;
  artDirection?: string;
  isVisibleToPlayers?: boolean;
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
  includeLabels?: boolean;
}

export type UpdateMapInput = Partial<
  Omit<
    CreateMapInput,
    'generateImage' | 'ignoreCampaignArtDirection' | 'includeLabels'
  >
> & { displayOrder?: number };

export interface CreateMapPointInput {
  name: string;
  description?: string;
  notes?: string;
  type?: string;
  x?: number | null;
  y?: number | null;
  isVisibleToPlayers?: boolean;
  showLabelOnMap?: boolean;
  displayOrder?: number;
}

export type UpdateMapPointInput = Partial<CreateMapPointInput>;
