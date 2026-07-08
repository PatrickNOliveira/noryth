/**
 * Allowed values for a campaign. Themes and tones are stored as stable,
 * language-neutral slugs (`custom` folds a free-text value into the field);
 * the frontend maps known slugs to i18n labels.
 */
export const CAMPAIGN_THEMES = [
  'dark-fantasy',
  'high-fantasy',
  'fantasy',
  'sci-fi',
  'cyberpunk',
  'steampunk',
  'post-apocalyptic',
  'horror',
  'modern',
  'custom',
] as const;
export type CampaignTheme = (typeof CAMPAIGN_THEMES)[number];

export const CAMPAIGN_TONES = [
  'grim',
  'heroic',
  'political',
  'exploration',
  'horror',
  'epic',
  'investigative',
  'comedic',
  'realistic',
  'custom',
] as const;
export type CampaignTone = (typeof CAMPAIGN_TONES)[number];

export const CAMPAIGN_VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type CampaignVisibility = (typeof CAMPAIGN_VISIBILITIES)[number];

export const CAMPAIGN_STATUSES = ['active', 'paused', 'archived'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Languages accepted for `mainLanguage` — mirrors the frontend i18n set. */
export const CAMPAIGN_LANGUAGES = [
  'en-US',
  'en-GB',
  'pt-BR',
  'pt-PT',
  'es-ES',
  'fr-FR',
  'it-IT',
  'nl-NL',
] as const;
export type CampaignLanguage = (typeof CAMPAIGN_LANGUAGES)[number];

/**
 * Derived participant role. Owner and master are single authoritative concepts
 * on the campaign; a participant may be both (creator), one, or a plain player.
 */
export type ParticipantRole = 'OWNER_MASTER' | 'OWNER' | 'MASTER' | 'PLAYER';

export function participantRole(
  userId: string,
  ownerId: string,
  masterId: string,
): ParticipantRole {
  const isOwner = userId === ownerId;
  const isMaster = userId === masterId;
  if (isOwner && isMaster) return 'OWNER_MASTER';
  if (isOwner) return 'OWNER';
  if (isMaster) return 'MASTER';
  return 'PLAYER';
}

/** Realtime room for a campaign (presence + campaign-scoped events). */
export const campaignRoom = (campaignId: string): string =>
  `campaign:${campaignId}`;

/** Client → server messages for campaign presence. */
export const CAMPAIGN_PRESENCE_MESSAGES = {
  join: 'campaign:presence:join',
  leave: 'campaign:presence:leave',
} as const;

/** Server → client presence events. */
export const CAMPAIGN_PRESENCE_EVENTS = {
  online: 'campaign.participant.online',
  offline: 'campaign.participant.offline',
  snapshot: 'campaign.participants.presence',
} as const;

/** Cover image upload constraints. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const COVER_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const COVER_ALLOWED_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
