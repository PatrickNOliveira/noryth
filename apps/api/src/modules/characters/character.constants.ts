/**
 * Character = a narrative entity created by the master (NPCs in the broad sense:
 * nobles, monsters, villains, allies…). Deliberately has NO fixed relationship
 * field (ally/enemy/villain/neutral) — those are dynamic and belong to a future
 * relations structure, not to the character itself.
 */

/** Async portrait lifecycle. `none` = no image requested yet. */
export const CHARACTER_IMAGE_STATUSES = [
  'none',
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type CharacterImageStatus = (typeof CHARACTER_IMAGE_STATUSES)[number];

/**
 * Where a character was authored. `PREPARATION` is the default (campaign prep);
 * `SESSION` marks a character improvised by the master during a live session.
 * Audit-only — it never forks the character flow.
 */
export const CHARACTER_CREATION_SOURCES = ['PREPARATION', 'SESSION'] as const;
export type CharacterCreationSource =
  (typeof CHARACTER_CREATION_SOURCES)[number];

/** Job name for the async character portrait generation (shares the AI queue). */
export const GENERATE_CHARACTER_PORTRAIT_JOB = 'generate-character-portrait';

export interface GenerateCharacterPortraitPayload {
  characterId: string;
  requestedBy: string;
  /** Master's change request for this generation (regeneration/adjustment). */
  adjustments?: string;
  /** When true, the campaign's global art direction is NOT applied. */
  ignoreArtDirection?: boolean;
}

/** Realtime room for a single character (campaign room is used too). */
export const characterRoom = (characterId: string): string =>
  `character:${characterId}`;

/** Server → client events for character portrait generation. */
export const CHARACTER_IMAGE_EVENTS = {
  processing: 'character.image.processing',
  completed: 'character.image.completed',
  failed: 'character.image.failed',
} as const;

/** Server → client lifecycle events for characters (campaign room). */
export const CHARACTER_EVENTS = {
  created: 'character.created',
} as const;
