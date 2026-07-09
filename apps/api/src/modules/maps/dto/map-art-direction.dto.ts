import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for setting the campaign's global map art direction. */
export class UpdateMapArtDirectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  mapArtDirection?: string;
}

export interface MapArtDirectionDto {
  mapArtDirection: string;
}
