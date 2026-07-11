import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ITEM_STATES } from '../item.constants';

/** Payload for creating an item instance. */
export class CreateItemInstanceDto {
  @IsUUID()
  itemDefinitionId!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(160)
  customName?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  customDescription?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsIn(ITEM_STATES as unknown as string[])
  state?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  holderCharacterId?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  mapId?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  mapPointOfInterestId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  masterNotes?: string;
}
