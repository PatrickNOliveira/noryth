/**
 * Character RESOURCES are variable pools a character spends/accumulates (Vida,
 * Mana, Sanidade, Corrupção…) — distinct from ATTRIBUTES (who the character is).
 * They are fully dynamic per campaign: NOTHING is hardcoded (no HP/mana). The
 * master configures them; forms may override the effective maximum.
 */

/**
 * Resource kind. Only POOL (current/max) is implemented for now; COUNTER is
 * reserved for a future story and must not change behaviour yet.
 */
export const RESOURCE_TYPES = ['POOL', 'COUNTER'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

/**
 * How a character's initial `currentValue` is seeded when a resource state is
 * created: MAX → maxValue, ZERO → minValue, CUSTOM → the definition's
 * `defaultCurrentValue`.
 */
export const RESOURCE_CURRENT_STRATEGIES = ['MAX', 'ZERO', 'CUSTOM'] as const;
export type ResourceCurrentStrategy =
  (typeof RESOURCE_CURRENT_STRATEGIES)[number];
