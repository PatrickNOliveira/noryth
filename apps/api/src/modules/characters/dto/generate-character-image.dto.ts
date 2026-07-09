import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for (re)generating a character portrait. `adjustments` is the master's
 * change request; `ignoreCampaignArtDirection` skips the campaign's global art
 * direction for this run.
 */
export class GenerateCharacterImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adjustments?: string;

  @IsOptional()
  @IsBoolean()
  ignoreCampaignArtDirection?: boolean;
}
