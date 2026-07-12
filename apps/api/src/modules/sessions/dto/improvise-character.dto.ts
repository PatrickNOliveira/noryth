import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CharacterAttributeInput } from '@modules/characters/dto/character-attribute.input';

/**
 * The master's partial character sent to AI completion. EVERY field is optional
 * — the master may send just a name, a single idea, or a few fields. Whatever is
 * present is preserved verbatim by the service; the AI only fills the gaps.
 */
export class ImprovisePartialCharacterDto {
  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsUUID()
  factionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterAttributeInput)
  attributes?: CharacterAttributeInput[];
}

/**
 * Body for AI-completing an improvised character. `character` carries whatever
 * the master has typed so far; `instructions` is a free-text nudge (e.g. "an old
 * castle servant, terrified of the crypt").
 */
export class CompleteImprovisedCharacterDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ImprovisePartialCharacterDto)
  character?: ImprovisePartialCharacterDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;
}

/**
 * A completed, NOT-yet-persisted character draft returned to the master for
 * review before creation. Mirrors the create fields so the frontend can drop it
 * straight into the form.
 */
export interface ImprovisedCharacterDraftDto {
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  personality: string;
  motivations: string;
  secrets: string;
  notes: string;
  factionId: string | null;
  attributes: Array<{ attributeId: string; value: number }>;
}
