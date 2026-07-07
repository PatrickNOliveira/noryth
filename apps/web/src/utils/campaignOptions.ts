/**
 * Campaign option slugs — mirror the backend constants. Display labels come
 * from i18n (`campaign.theme.<slug>`, `campaign.tone.<slug>`, …) so nothing is
 * hardcoded and everything translates.
 */
export const CAMPAIGN_THEME_OPTIONS = [
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

export const CAMPAIGN_TONE_OPTIONS = [
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

export const CAMPAIGN_VISIBILITY_OPTIONS = ['private', 'unlisted', 'public'] as const;

const KNOWN_THEMES = new Set<string>(CAMPAIGN_THEME_OPTIONS);
const KNOWN_TONES = new Set<string>(CAMPAIGN_TONE_OPTIONS);

/** Known slug → i18n key; unknown value (custom free text) → shown as-is. */
export function themeLabelKey(theme: string): string | null {
  return KNOWN_THEMES.has(theme) ? `campaign.theme.${theme}` : null;
}
export function toneLabelKey(tone: string): string | null {
  return KNOWN_TONES.has(tone) ? `campaign.tone.${tone}` : null;
}
