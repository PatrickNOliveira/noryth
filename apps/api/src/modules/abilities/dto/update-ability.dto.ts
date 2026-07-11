import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Master edits any campaign ability; every field optional. */
export class UpdateAbilityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
  @IsBoolean()
  isUnique?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  factionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  masterNotes?: string;
}
