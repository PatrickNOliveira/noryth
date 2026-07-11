import { ArrayNotEmpty, IsArray, IsIn, IsOptional } from 'class-validator';
import { SPRITE_DIRECTIONS, SpriteDirection } from '../session-character.constants';

/** Requests (re)generation of a character's session sprites. */
export class GenerateSpritesDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(SPRITE_DIRECTIONS, { each: true })
  directions?: SpriteDirection[];
}
