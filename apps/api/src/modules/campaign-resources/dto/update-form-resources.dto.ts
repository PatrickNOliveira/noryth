import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * One form resource override. `maxValue = null` (or omitted) means "no override
 * for this resource" — the character's base max is used, and any existing
 * override is removed.
 */
export class FormResourceOverrideValueInput {
  @IsUUID()
  resourceDefinitionId!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  maxValue?: number | null;
}

/** PUT body to set a form's resource max overrides (master only). */
export class UpdateFormResourcesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormResourceOverrideValueInput)
  resources!: FormResourceOverrideValueInput[];
}

/** A form's resource override view. */
export interface FormResourceOverrideDto {
  resourceDefinitionId: string;
  name: string;
  minValue: number;
  baseMaxValue: number | null;
  /** The form's override max, or null when the base max is used. */
  maxValue: number | null;
  displayOrder: number;
}
