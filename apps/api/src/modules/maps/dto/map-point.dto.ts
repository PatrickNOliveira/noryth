import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Payload for creating a point of interest. Only `name` is required. */
export class CreateMapPointDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  /** Percentage 0–100 on the map image; null to unplace. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number | null;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number | null;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  /** Draw this point's name as a label overlay on the map image. */
  @IsOptional()
  @IsBoolean()
  showLabelOnMap?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

/** Payload for moving a point on the 2.5D session scene. */
export class UpdateScenePositionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  sceneX!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  sceneY!: number;

  /** Echoed on the realtime event so clients can drop their own stale updates. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}

/** Payload for updating a point of interest; every field optional. */
export class UpdateMapPointDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number | null;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number | null;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsBoolean()
  showLabelOnMap?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
