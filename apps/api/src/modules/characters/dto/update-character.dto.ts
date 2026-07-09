import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CharacterAttributeInput } from './character-attribute.input';

/**
 * Payload for updating a character. Every field is optional; only provided ones
 * change. `factionId: null` unlinks the faction. When `attributes` is provided,
 * it REPLACES the character's whole attribute set.
 */
export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  history?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  appearance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  motivations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  secrets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  /** UUID to link a faction, or explicit null to unlink. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID()
  factionId?: string | null;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterAttributeInput)
  attributes?: CharacterAttributeInput[];
}
