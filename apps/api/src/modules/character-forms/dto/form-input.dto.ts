import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Create a new form. `appearanceDescription` is required (drives the image). */
export class CreateCharacterFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  shortDescription?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  appearanceDescription!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  usesBaseAbilities?: boolean;
}

/** Update a form; every field optional. */
export class UpdateCharacterFormDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  appearanceDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  usesBaseAbilities?: boolean;
}

class FormAttributeItemDto {
  @IsUUID()
  attributeId!: string;

  @IsInt()
  value!: number;
}

/** Replace the form's attribute overrides. */
export class UpdateFormAttributesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormAttributeItemDto)
  attributes!: FormAttributeItemDto[];
}

/** Replace the form's abilities. */
export class UpdateFormAbilitiesDto {
  @IsBoolean()
  usesBaseAbilities!: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  abilityDefinitionIds?: string[];
}

/** (Re)generate the form image. */
export class GenerateFormImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  adjustments?: string;

  @IsOptional()
  @IsBoolean()
  ignoreArtDirection?: boolean;
}
