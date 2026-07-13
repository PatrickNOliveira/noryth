import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RESOURCE_CURRENT_STRATEGIES,
  RESOURCE_TYPES,
  ResourceCurrentStrategy,
  ResourceType,
} from '../resource.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Payload for creating a campaign resource definition. */
export class CreateResourceDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(RESOURCE_TYPES as unknown as string[])
  type?: ResourceType;

  @IsOptional()
  @IsInt()
  minValue?: number;

  @IsInt()
  defaultMaxValue!: number;

  @IsOptional()
  @IsIn(RESOURCE_CURRENT_STRATEGIES as unknown as string[])
  defaultCurrentValueStrategy?: ResourceCurrentStrategy;

  @IsOptional()
  @IsInt()
  defaultCurrentValue?: number;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
