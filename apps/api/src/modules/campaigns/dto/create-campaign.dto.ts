import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CAMPAIGN_LANGUAGES,
  CAMPAIGN_THEMES,
  CAMPAIGN_TONES,
  CAMPAIGN_VISIBILITIES,
  CampaignLanguage,
  CampaignTheme,
  CampaignTone,
  CampaignVisibility,
} from '../campaign.constants';

/** Normalizes empty multipart strings to `undefined` so optionals stay optional. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

/**
 * Payload for creating a campaign. Arrives as `multipart/form-data` (the cover
 * image is handled separately by the file interceptor), so every value is a
 * string until transformed.
 */
export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsIn(CAMPAIGN_THEMES as unknown as string[])
  theme!: CampaignTheme;

  @ValidateIf((o) => o.theme === 'custom')
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customTheme?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  shortDescription!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  premise!: string;

  @IsIn(CAMPAIGN_TONES as unknown as string[])
  tone!: CampaignTone;

  @ValidateIf((o) => o.tone === 'custom')
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customTone?: string;

  @IsIn(CAMPAIGN_LANGUAGES as unknown as string[])
  mainLanguage!: CampaignLanguage;

  @IsIn(CAMPAIGN_VISIBILITIES as unknown as string[])
  visibility!: CampaignVisibility;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxPlayers?: number;
}
