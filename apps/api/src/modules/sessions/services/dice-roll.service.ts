import { randomInt } from 'crypto';
import { Injectable } from '@nestjs/common';

/**
 * Pure dice randomness, isolated so the RNG can be swapped/tested independently.
 * Uses Node's cryptographically-secure `randomInt` rather than `Math.random`.
 * Every die returns an integer in [1, sides].
 */
@Injectable()
export class DiceRollService {
  /** Rolls a single die: an integer in [1, sides] (upper bound is exclusive). */
  rollDie(sides: number): number {
    return randomInt(1, sides + 1);
  }

  /** Rolls `quantity` dice of `sides` sides, returning the individual results. */
  roll(sides: number, quantity: number): number[] {
    return Array.from({ length: quantity }, () => this.rollDie(sides));
  }
}
