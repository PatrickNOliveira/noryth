import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Payload for a player creating their own character. Attributes are NOT set
 * here — they are distributed later against the budget. Master-only fields
 * (visibility, budget, master notes) are intentionally absent.
 */
export class CreatePlayerCharacterDto {
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
  playerNotes?: string;

  @IsOptional()
  @IsUUID()
  factionId?: string;

  @IsOptional()
  @IsBoolean()
  generateImage?: boolean;

  @IsOptional()
  @IsBoolean()
  ignoreCampaignArtDirection?: boolean;
}
