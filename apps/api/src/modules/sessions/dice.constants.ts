/**
 * Dice rolling during a live session (master only). This story supports a single
 * die type per roll, N identical dice, and a public/secret visibility. No
 * modifiers, no mixed expressions, no advantage — those are explicitly out of
 * scope. Results are always computed on the backend (source of truth).
 */

/** Allowed dice and their side counts. Anything outside this map is rejected. */
export const DICE_TYPES = {
  D2: 2,
  D4: 4,
  D6: 6,
  D8: 8,
  D10: 10,
  D12: 12,
  D20: 20,
} as const;

export type DiceType = keyof typeof DICE_TYPES;

/** The allowed die type names, for validation (`@IsIn`). */
export const DICE_TYPE_NAMES = Object.keys(DICE_TYPES) as DiceType[];

/** A roll is either broadcast to everyone (PUBLIC) or master-only (SECRET). */
export const DICE_VISIBILITIES = ['PUBLIC', 'SECRET'] as const;
export type DiceVisibility = (typeof DICE_VISIBILITIES)[number];

/** Quantity bounds — a safe cap so a roll can never be abused. */
export const DICE_QUANTITY_MIN = 1;
export const DICE_QUANTITY_MAX = 50;

/** Server → client event for PUBLIC rolls (emitted to the campaign room). */
export const SESSION_DICE_EVENTS = {
  rolled: 'session.dice.rolled',
} as const;
