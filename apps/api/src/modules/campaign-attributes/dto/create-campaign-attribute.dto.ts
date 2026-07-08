import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Trims incoming string values so " Força " never passes as a distinct name. */
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Payload for creating a campaign attribute (JSON). */
export class CreateCampaignAttributeDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsInt()
  minValue!: number;

  @IsInt()
  maxValue!: number;

  /** Optional; when omitted the attribute is appended to the end of the list. */
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
