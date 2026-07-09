import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Payload for updating a map. Every field is optional; only provided ones
 * change. `parentMapId: null` makes the map a root.
 */
export class UpdateMapDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  /** UUID to set a parent, or explicit null to make the map a root. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID()
  parentMapId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  history?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  artDirection?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
