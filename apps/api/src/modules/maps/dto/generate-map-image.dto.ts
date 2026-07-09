import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for (re)generating a map image. */
export class GenerateMapImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adjustments?: string;

  @IsOptional()
  @IsBoolean()
  ignoreCampaignArtDirection?: boolean;

  /** Allow the model to draw readable labels on the map (default false). */
  @IsOptional()
  @IsBoolean()
  includeLabels?: boolean;
}
