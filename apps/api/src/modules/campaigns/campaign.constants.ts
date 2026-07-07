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
