import { CampaignMap } from './map';

export type SessionStatus = 'ACTIVE' | 'ENDED';

export type SpriteDirection = 'FRONT' | 'BACK';
export type SpriteImageStatus =
  | 'none'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

/** One directional session sprite of a character. */
export interface SpriteView {
  direction: SpriteDirection;
  imageUrl: string | null;
  imageStatus: SpriteImageStatus;
}

/** A character placed on the active session map (position in percent 0–100). */
export interface SessionCharacter {
  id: string;
  campaignId: string;
  sessionId: string;
  mapId: string;
  characterId: string;
  characterName: string;
  x: number;
  y: number;
  facing: SpriteDirection;
  /** Visual scale of the sprite on the map only (1.0 = base height). */
  sizeScale: number;
  isVisibleToPlayers: boolean;
  sprites: SpriteView[];
  createdAt: string;
  updatedAt: string;
  /** Client-only: a not-yet-confirmed placement (rendered slightly faded). */
  isOptimistic?: boolean;
}

/** Visual scale bounds for a placed character (map-only). */
export const SIZE_SCALE_MIN = 0.15;
export const SIZE_SCALE_MAX = 1.2;
export const SIZE_SCALE_STEP = 0.05;
export const SIZE_SCALE_DEFAULT = 0.35;

export interface AddSessionCharacterInput {
  characterId: string;
  x?: number;
  y?: number;
  facing?: SpriteDirection;
  isVisibleToPlayers?: boolean;
}

/** Result of switching the active session's map. */
export interface ChangeMapResult {
  session: CampaignSession;
  previousMapId: string;
  removedSessionCharacterIds: string[];
}

export interface UpdateSessionCharacterInput {
  x?: number;
  y?: number;
  facing?: SpriteDirection;
  sizeScale?: number;
  isVisibleToPlayers?: boolean;
  /** Echoed on the realtime event so the client can drop its own stale updates. */
  clientMutationId?: string;
}

/** The live session of a campaign, as returned by the API. */
export interface CampaignSession {
  id: string;
  campaignId: string;
  status: SessionStatus;
  startedByUserId: string;
  initialMapId: string;
  currentMapId: string;
  startedAt: string;
  endedAt: string | null;
  endedByUserId?: string | null;
  /** Current map as the viewer may see it (present on start and active fetch). */
  map: CampaignMap | null;
  createdAt: string;
  updatedAt: string;
}

/** Result of ending the active session. */
export interface EndSessionResult {
  sessionId: string;
  tableId: string;
  status: SessionStatus;
  endedAt: string | null;
  endedByUserId: string | null;
}
