import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CharacterAttributeInput } from './character-attribute.input';

/** Payload for creating a master character (JSON). Only `name` is required. */
export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

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

  @IsOptional()
  @IsUUID()
  factionId?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterAttributeInput)
  attributes?: CharacterAttributeInput[];

  @IsOptional()
  @IsBoolean()
  generateImage?: boolean;

  /** Skip the campaign's global art direction for the initial generation. */
  @IsOptional()
  @IsBoolean()
  ignoreCampaignArtDirection?: boolean;
}
