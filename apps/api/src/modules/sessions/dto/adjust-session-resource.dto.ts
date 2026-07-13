import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Spend/add on a placed character's resource during a session (master only).
 * `delta` is a signed integer applied to the effective CURRENT value; the service
 * clamps the result to [minValue, effectiveMax]. `@IsInt` rejects NaN/Infinity/
 * non-integers at the boundary.
 */
export class AdjustSessionResourceDto {
  @IsInt()
  delta!: number;

  /**
   * Opaque client-side version echoed back on the realtime event so the client
   * can ignore its own stale updates (rapid spend/add). Not persisted.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
