/**
 * A character resource with BASE and EFFECTIVE values. The effective max comes
 * from the active form's override when present, otherwise the character's base
 * max; the effective current is the base current clamped to the effective max.
 */
export interface CharacterResourceDto {
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
