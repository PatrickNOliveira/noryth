import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for setting the campaign's global item art direction. */
export class UpdateItemArtDirectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  itemArtDirection?: string;
}

export interface ItemArtDirectionDto {
  itemArtDirection: string;
}
