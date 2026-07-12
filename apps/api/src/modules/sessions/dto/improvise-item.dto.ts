import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateItemDefinitionDto } from '@modules/items/dto/create-item-definition.dto';
import { ITEM_STATES } from '@modules/items/item.constants';

/**
 * The master's partial item sent to AI completion. EVERY field is optional — the
 * master may send just a name, a type, a short description or an idea. Whatever
 * is present is preserved verbatim; the AI only fills the gaps.
 */
export class ImprovisePartialItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

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
  effectDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rulesText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  masterNotes?: string;

  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;
}

/** Body for AI-completing an improvised item. */
export class CompleteImprovisedItemDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ImprovisePartialItemDto)
  item?: ImprovisePartialItemDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  /** UI locale (e.g. "en-US") — the language the AI must write completions in. */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  targetLanguage?: string;
}

/**
 * Optional initial occurrence created alongside the definition. When `create` is
 * false/absent, only the definition is created. Location is validated by the
 * existing item-instance service (character XOR map/point).
 */
export class SessionItemInstanceInputDto {
  @IsOptional()
  @IsBoolean()
  create?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsIn(ITEM_STATES as unknown as string[])
  state?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  holderCharacterId?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  mapId?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  mapPointOfInterestId?: string | null;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  masterNotes?: string;
}

/** Body for creating an improvised item (definition + optional first instance). */
export class CreateSessionItemDto {
  @ValidateNested()
  @Type(() => CreateItemDefinitionDto)
  item!: CreateItemDefinitionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionItemInstanceInputDto)
  instance?: SessionItemInstanceInputDto;
}

/**
 * A completed, NOT-yet-persisted item draft returned to the master for review
 * before creation. Mirrors the create fields so the frontend can drop it into
 * the form.
 */
export interface ImprovisedItemDraftDto {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  effectDescription: string;
  rulesText: string;
  masterNotes: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
}
