export const RESOURCE_TYPES = ['POOL', 'COUNTER'] as const;
export const RESOURCE_CURRENT_STRATEGIES = ['MAX', 'ZERO', 'CUSTOM'] as const;

/** A character resource configured at the campaign level (Vida, Mana, Sanidade…). */
export interface ResourceDefinition {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  type: string;
  minValue: number;
  defaultMaxValue: number;
  defaultCurrentValueStrategy: string;
  defaultCurrentValue: number | null;
  isVisibleToPlayers: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceInput {
  name: string;
  description?: string;
  type?: string;
  minValue?: number;
  defaultMaxValue: number;
  defaultCurrentValueStrategy?: string;
  defaultCurrentValue?: number;
  isVisibleToPlayers?: boolean;
  displayOrder?: number;
}

export type UpdateResourceInput = Partial<CreateResourceInput>;

/** A character resource with base + effective values (effective honors active form). */
export interface CharacterResource {
  resourceDefinitionId: string;
  name: string;
  description: string;
  type: string;
  minValue: number;
  currentValue: number;
  baseMaxValue: number;
  effectiveMaxValue: number;
  effectiveCurrentValue: number;
  isOverriddenByActiveForm: boolean;
  isVisibleToPlayers: boolean;
  displayOrder: number;
}

export interface CharacterResourceValueInput {
  resourceDefinitionId: string;
  currentValue: number;
  maxValue: number;
}

/**
 * Result / realtime payload of a session resource adjustment. `currentValue` /
 * `maxValue` are the effective (post-clamp) values ready to display; the base
 * fields are echoed for completeness.
 */
export interface SessionResourceUpdate {
  tableId: string;
  sessionId: string;
  sessionCharacterId: string;
  characterId: string;
  resourceDefinitionId: string;
  name: string;
  currentValue: number;
  maxValue: number;
  baseCurrentValue: number;
  baseMaxValue: number;
  effectiveCurrentValue: number;
  effectiveMaxValue: number;
  isOverriddenByActiveForm: boolean;
  isVisibleToPlayers: boolean;
  originUserId: string;
  clientMutationId: string | null;
}

/** A form's resource max override alongside the character's base max. */
export interface FormResourceOverride {
  resourceDefinitionId: string;
  name: string;
  minValue: number;
  baseMaxValue: number | null;
  maxValue: number | null;
  displayOrder: number;
}

export interface FormResourceOverrideValueInput {
  resourceDefinitionId: string;
  maxValue: number | null;
}
