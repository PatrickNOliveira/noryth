/**
 * Items are narrative/mechanical objects of a campaign. We model them in two
 * layers (mandatory, even for MVP):
 *   - ItemDefinition: the concept/base (name, lore, rules, base image).
 *   - ItemInstance: a concrete occurrence in the campaign (location, quantity…).
 * There is deliberately NO rarity field.
 */

/** Suggested item types; stored as a free string so the master isn't boxed in. */
export const ITEM_TYPES = [
  'WEAPON',
  'ARMOR',
  'CONSUMABLE',
  'RELIC',
  'DOCUMENT',
  'KEY',
  'TREASURE',
  'MAGIC_ITEM',
  'TOOL',
  'MISC',
  'OTHER',
] as const;

/** Simple narrative state of an instance (not automated). */
export const ITEM_STATES = [
  'AVAILABLE',
  'HIDDEN',
  'CARRIED',
  'FOUND',
  'CONSUMED',
  'DESTROYED',
  'LOST',
] as const;
export type ItemState = (typeof ITEM_STATES)[number];

/** Async image lifecycle. `none` = no image requested yet. */
export const ITEM_IMAGE_STATUSES = [
  'none',
  'pending',
  'processing',
  'completed',
  'failed',
] as const;
export type ItemImageStatus = (typeof ITEM_IMAGE_STATUSES)[number];

/** Job name for the async item image generation (shares the AI image queue). */
export const GENERATE_ITEM_IMAGE_JOB = 'generate-item-image';

export interface GenerateItemImagePayload {
  itemDefinitionId: string;
  requestedBy: string;
  adjustments?: string;
  ignoreArtDirection?: boolean;
}

/** Realtime room for a single item definition (campaign room is used too). */
export const itemRoom = (itemDefinitionId: string): string =>
  `item:${itemDefinitionId}`;

/** Server → client events for item image generation. */
export const ITEM_IMAGE_EVENTS = {
  processing: 'item.image.processing',
  completed: 'item.image.completed',
  failed: 'item.image.failed',
} as const;
