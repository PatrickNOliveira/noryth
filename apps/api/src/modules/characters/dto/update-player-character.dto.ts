import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Payload for a player editing THEIR character. Only narrative/visual fields,
 * faction and player notes — never budget, master notes, visibility or ids.
 * `factionId: null` unlinks.
 */
export class UpdatePlayerCharacterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

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
  appearance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  motivations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  secrets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  playerNotes?: string;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID()
  factionId?: string | null;
}
