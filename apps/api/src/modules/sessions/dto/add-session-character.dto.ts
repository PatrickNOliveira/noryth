import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SPRITE_DIRECTIONS, SpriteDirection } from '../session-character.constants';

/** Places a campaign character on the active session map. Master only. */
export class AddSessionCharacterDto {
  @IsUUID()
  characterId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number;

  @IsOptional()
  @IsIn(SPRITE_DIRECTIONS)
  facing?: SpriteDirection;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;
}
