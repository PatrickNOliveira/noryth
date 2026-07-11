import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for (re)generating an item image. */
export class GenerateItemImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adjustments?: string;

  @IsOptional()
  @IsBoolean()
  ignoreCampaignArtDirection?: boolean;
}
