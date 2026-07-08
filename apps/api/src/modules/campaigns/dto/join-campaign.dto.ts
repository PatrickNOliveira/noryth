import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Payload for joining a campaign. Password is only required by protected ones. */
export class JoinCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string;
}
