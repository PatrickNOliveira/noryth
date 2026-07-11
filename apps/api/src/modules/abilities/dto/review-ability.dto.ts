import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Master's review note when approving / rejecting / requesting changes. */
export class ReviewAbilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reviewNotes?: string;
}
