import { IsIn, IsOptional } from 'class-validator';
import { ITEM_STATES } from '../item.constants';

/** Clear the holder of an instance; optionally set its resulting state. */
export class UnassignItemInstanceDto {
  @IsOptional()
  @IsIn(ITEM_STATES as unknown as string[])
  state?: string;
}
