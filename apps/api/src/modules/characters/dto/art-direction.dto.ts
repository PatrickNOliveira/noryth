import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for setting the campaign's global character art direction. */
export class UpdateArtDirectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  characterArtDirection?: string;
}

/** Response shape for the art direction endpoints. */
export interface ArtDirectionDto {
  characterArtDirection: string;
}
