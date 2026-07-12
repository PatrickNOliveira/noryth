/**
 * Session characters: placing campaign characters onto the active session map as
 * 2.5D sprites (full-body, third-person — NOT a cropped portrait, NOT a circular
 * token). This story only covers placement/position/facing/visibility + async
 * sprite generation; no combat/movement/grid/turns.
 */

/**
 * Facing directions of a session sprite. Only FRONT/BACK are implemented now;
 * the extra diagonals are declared so the model/data can grow without a
 * migration churn later.
 */
export const SPRITE_DIRECTIONS = ['FRONT', 'BACK'] as const;
export type SpriteDirection = (typeof SPRITE_DIRECTIONS)[number];

/** Full facing set reserved for the future (only FRONT/BACK are generated now). */
export const SPRITE_DIRECTIONS_FUTURE = [
  'FRONT',
  'BACK',
  'LEFT',
  'RIGHT',
  'FRONT_LEFT',
  'FRONT_RIGHT',
  'BACK_LEFT',
  'BACK_RIGHT',
] as const;

/** Bounds for a placed character's visual scale on the map. */
export const SIZE_SCALE_MIN = 0.15;
export const SIZE_SCALE_MAX = 1.2;
export const SIZE_SCALE_DEFAULT = 0.35;

/** Async sprite lifecycle. `none` = not requested yet. */
export const SPRITE_IMAGE_STATUSES = [
  'none',
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type SpriteImageStatus = (typeof SPRITE_IMAGE_STATUSES)[number];

/** Job name for async session-sprite generation (shares the AI image queue). */
export const GENERATE_CHARACTER_SESSION_SPRITE_JOB =
  'generate-character-session-sprite';

export interface GenerateCharacterSessionSpritePayload {
  spriteId: string;
  requestedBy: string;
}

/** Server → client events for session characters (emitted to the campaign room). */
export const SESSION_CHARACTER_EVENTS = {
  added: 'session.character.added',
  moved: 'session.character.moved',
  removed: 'session.character.removed',
  formChanged: 'session.character.form_changed',
} as const;

/** Server → client events for session-sprite generation. */
export const CHARACTER_SESSION_SPRITE_EVENTS = {
  processing: 'character.session_sprite.processing',
  completed: 'character.session_sprite.completed',
  failed: 'character.session_sprite.failed',
} as const;
