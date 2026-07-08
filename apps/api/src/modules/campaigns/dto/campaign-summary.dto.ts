import { Campaign } from '../entities/campaign.entity';

/**
 * Minimal, non-sensitive view of a campaign for discovery and the join screen.
 * Reachable by any authenticated user (that's the point of a share link), so it
 * exposes only what's needed to decide to join — never the premise or password.
 */
export interface CampaignSummaryDto {
  id: string;
  name: string;
  shortDescription: string;
  theme: string;
  tone: string;
  coverImageUrl: string | null;
  visibility: string;
  status: string;
  hasPassword: boolean;
  maxPlayers: number | null;
  playerCount: number;
  /** Whether the requesting user already takes part in the campaign. */
  isParticipant: boolean;
  /** True when the player limit has been reached (maxPlayers === 0 ⇒ always). */
  isFull: boolean;
}

export function toCampaignSummaryDto(
  campaign: Campaign,
  meta: { isParticipant: boolean; playerCount: number },
): CampaignSummaryDto {
  const isFull =
    campaign.maxPlayers != null && meta.playerCount >= campaign.maxPlayers;
  return {
    id: campaign.id,
    name: campaign.name,
    shortDescription: campaign.shortDescription,
    theme: campaign.theme,
    tone: campaign.tone,
    coverImageUrl: campaign.coverImageUrl,
    visibility: campaign.visibility,
    status: campaign.status,
    hasPassword: campaign.passwordHash != null,
    maxPlayers: campaign.maxPlayers,
    playerCount: meta.playerCount,
    isParticipant: meta.isParticipant,
    isFull,
  };
}
