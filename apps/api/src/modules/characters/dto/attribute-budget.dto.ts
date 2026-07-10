import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CharacterAttributeInput } from './character-attribute.input';

/** Player (or master) distributing a character's attribute values. */
export class DistributeAttributesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterAttributeInput)
  attributes!: CharacterAttributeInput[];
}

/** Master setting a single character's attribute-point budget (null clears it). */
export class SetAttributeBudgetDto {
  @ValidateIf((_o, value) => value !== null)
  @IsInt()
  @Min(0)
  attributePointsBudget!: number | null;
}

/** Master setting the campaign default player-character budget (null clears it). */
export class SetDefaultBudgetDto {
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsInt()
  @Min(0)
  defaultPlayerCharacterAttributePoints?: number | null;
}
