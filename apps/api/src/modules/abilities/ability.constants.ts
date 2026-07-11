/**
 * Abilities are narrative/mechanical capabilities a character can hold. They are
 * modeled in two layers: an AbilityDefinition (the ability itself, with an
 * approval status) and a CharacterAbility (the link to a character).
 *
 * Golden rule: player proposes → master approves → character uses.
 */

export const ABILITY_TYPES = [
  'COMBAT',
  'SOCIAL',
  'MAGIC',
  'RITUAL',
  'SPIRITUAL',
  'CURSE',
  'BLESSING',
  'LINEAGE',
  'KNOWLEDGE',
  'PASSIVE',
  'OTHER',
] as const;

/** Approval lifecycle. Master-created abilities are born APPROVED. */
export const ABILITY_APPROVAL_STATUSES = [
  'PENDING_APPROVAL',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
] as const;
export type AbilityApprovalStatus =
  (typeof ABILITY_APPROVAL_STATUSES)[number];

/** State of a character's ability link. */
export const CHARACTER_ABILITY_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'SEALED',
  'LOST',
] as const;
export type CharacterAbilityStatus =
  (typeof CHARACTER_ABILITY_STATUSES)[number];

/** Server → client events for abilities (best-effort UI hints). */
export const ABILITY_EVENTS = {
  proposed: 'ability.proposed',
  approved: 'ability.approved',
  rejected: 'ability.rejected',
  changesRequested: 'ability.changes_requested',
  assigned: 'ability.assigned',
  removed: 'ability.removed',
} as const;
