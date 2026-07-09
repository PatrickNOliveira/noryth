import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Payload for creating a map (JSON). Only `name` is required. */
export class CreateMapDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsUUID()
  parentMapId?: string;

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
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  artDirection?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsBoolean()
  generateImage?: boolean;

  @IsOptional()
  @IsBoolean()
  ignoreCampaignArtDirection?: boolean;

  /** Allow the model to draw readable labels on the initial generation. */
  @IsOptional()
  @IsBoolean()
  includeLabels?: boolean;
}
