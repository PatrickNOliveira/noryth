/**
 * A map is a narrative entity of the campaign — a place at some scale (world,
 * region, city, dungeon…), with an optional parent map, points of interest,
 * visibility, its own art direction and an async-generated image.
 */

/** Suggested map scales. Stored as a free string so the master isn't boxed in. */
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

/** Async image lifecycle. `none` = no image requested yet. */
export const MAP_IMAGE_STATUSES = [
  'none',
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type MapImageStatus = (typeof MAP_IMAGE_STATUSES)[number];

/** Job name for the async map image generation (shares the AI image queue). */
export const GENERATE_MAP_IMAGE_JOB = 'generate-map-image';

export interface GenerateMapImagePayload {
  mapId: string;
  requestedBy: string;
  adjustments?: string;
  ignoreArtDirection?: boolean;
  /** Allow the model to draw readable labels (default false). */
  includeLabels?: boolean;
}

/** Realtime room for a single map (campaign room is used too). */
export const mapRoom = (mapId: string): string => `map:${mapId}`;

/** Server → client events for map image generation. */
export const MAP_IMAGE_EVENTS = {
  processing: 'map.image.processing',
  completed: 'map.image.completed',
  failed: 'map.image.failed',
} as const;

/**
 * Job name for the async 2.5D "session scene" generation — a game-viewport asset
 * derived from the map (shares the AI image queue).
 */
export const GENERATE_MAP_SESSION_SCENE_JOB = 'generate-map-session-scene';

export interface GenerateMapSessionScenePayload {
  mapId: string;
  requestedBy: string;
  adjustments?: string;
}

/** Server → client events for session-scene generation. */
export const MAP_SESSION_SCENE_EVENTS = {
  processing: 'map.session_scene.processing',
  completed: 'map.session_scene.completed',
  failed: 'map.session_scene.failed',
} as const;

/** Server → client event when a point's 2.5D scene position is moved. */
export const MAP_POINT_EVENTS = {
  scenePositionUpdated: 'map.point.scene_position.updated',
} as const;
