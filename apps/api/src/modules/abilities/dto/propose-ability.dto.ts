import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Player proposes an ability for their own character (born PENDING_APPROVAL). */
export class ProposeAbilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

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
}

/** Player edits their own proposal (only while pending / changes requested). */
export class UpdateProposalDto {
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
}
