import { Campaign } from '../entities/campaign.entity';

/**
 * Safe public view of a campaign. `passwordHash` is never exposed — only a
 * boolean `hasPassword` flag.
 */
export interface CampaignDto {
  id: string;
  ownerId: string;
  masterId: string;
  name: string;
  theme: string;
  shortDescription: string;
  premise: string;
  tone: string;
  mainLanguage: string;
  visibility: string;
  hasPassword: boolean;
  maxPlayers: number | null;
  coverImageUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toCampaignDto(campaign: Campaign): CampaignDto {
  return {
    id: campaign.id,
    ownerId: campaign.ownerId,
    masterId: campaign.masterId,
    name: campaign.name,
    theme: campaign.theme,
    shortDescription: campaign.shortDescription,
    premise: campaign.premise,
    tone: campaign.tone,
    mainLanguage: campaign.mainLanguage,
    visibility: campaign.visibility,
    hasPassword: campaign.passwordHash != null,
    maxPlayers: campaign.maxPlayers,
    coverImageUrl: campaign.coverImageUrl,
    status: campaign.status,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}
