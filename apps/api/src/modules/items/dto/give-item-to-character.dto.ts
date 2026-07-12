import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/** Give an item to a character (creates/transfers an instance). */
export class GiveItemToCharacterDto {
  @IsUUID()
  characterId!: string;

  /** Quantity for non-unique items; ignored (forced to 1) for unique items. */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
