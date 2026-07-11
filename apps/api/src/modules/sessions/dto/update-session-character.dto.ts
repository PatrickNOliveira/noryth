import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SIZE_SCALE_MAX,
  SIZE_SCALE_MIN,
  SPRITE_DIRECTIONS,
  SpriteDirection,
} from '../session-character.constants';

/** Updates position / facing / visibility / size of a placed session character. */
export class UpdateSessionCharacterDto {
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

  /** Visual scale on the map only. Clamped to [MIN, MAX]. */
  @IsOptional()
  @IsNumber()
  @Min(SIZE_SCALE_MIN)
  @Max(SIZE_SCALE_MAX)
  sizeScale?: number;

  /**
   * Opaque client-side version echoed back on the realtime event, so the client
   * can ignore its own stale updates (e.g. rapid resizing). Not persisted.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
