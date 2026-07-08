import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Adjustment notes for re-running the symbol agent (reject-with-adjustments). */
export class RegenerateFactionImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
