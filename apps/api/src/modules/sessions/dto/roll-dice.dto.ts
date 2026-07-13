import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DICE_QUANTITY_MAX,
  DICE_QUANTITY_MIN,
  DICE_TYPE_NAMES,
  DICE_VISIBILITIES,
  DiceType,
  DiceVisibility,
} from '../dice.constants';

/**
 * Master rolls N identical dice during a session. `diceType` must be one of the
 * allowed dice; `quantity` is a bounded integer; `visibility` decides whether the
 * roll is broadcast. The backend derives `sides` and computes the results.
 */
export class RollDiceDto {
  @IsIn(DICE_TYPE_NAMES)
  diceType!: DiceType;

  @IsInt()
  @Min(DICE_QUANTITY_MIN)
  @Max(DICE_QUANTITY_MAX)
  quantity!: number;

  @IsIn(DICE_VISIBILITIES)
  visibility!: DiceVisibility;

  /**
   * Opaque client-side id echoed back (and on the realtime event) so the master
   * can de-duplicate its own public roll (HTTP response vs. broadcast echo).
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
