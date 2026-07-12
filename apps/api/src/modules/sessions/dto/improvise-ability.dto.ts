import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateAbilityDto } from '@modules/abilities/dto/create-ability.dto';

/** Where to link the newly created ability. */
export const SESSION_ABILITY_LINK_TARGETS = [
  'NONE',
  'CHARACTER',
  'ACTIVE_FORM',
] as const;
export type SessionAbilityLinkTarget =
  (typeof SESSION_ABILITY_LINK_TARGETS)[number];

/**
 * The master's partial ability sent to AI completion. EVERY field is optional —
 * the master may send just a name, a type or an idea. Whatever is present is
 * preserved verbatim; the AI only fills the gaps.
 */
export class ImprovisePartialAbilityDto {
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
  @MaxLength(5000)
  effectDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rulesText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  costDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  limitationDescription?: string;

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

/** Body for AI-completing an improvised ability. */
export class CompleteImprovisedAbilityDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ImprovisePartialAbilityDto)
  ability?: ImprovisePartialAbilityDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  /** UI locale (e.g. "en-US") — the language the AI must write completions in. */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  targetLanguage?: string;

  /** Optional character the master is focusing on (context only). */
  @IsOptional()
  @IsUUID()
  characterId?: string;
}

/** Optional link created alongside the definition. */
export class SessionAbilityLinkDto {
  @IsIn(SESSION_ABILITY_LINK_TARGETS as unknown as string[])
  target!: SessionAbilityLinkTarget;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  characterId?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  formId?: string | null;
}

/** Body for creating an improvised ability (definition + optional link). */
export class CreateSessionAbilityDto {
  @ValidateNested()
  @Type(() => CreateAbilityDto)
  ability!: CreateAbilityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionAbilityLinkDto)
  link?: SessionAbilityLinkDto;
}

/**
 * A completed, NOT-yet-persisted ability draft returned to the master for review
 * before creation. Mirrors the create fields so the frontend can drop it into
 * the form.
 */
export interface ImprovisedAbilityDraftDto {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  effectDescription: string;
  rulesText: string;
  costDescription: string;
  limitationDescription: string;
  masterNotes: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
}
