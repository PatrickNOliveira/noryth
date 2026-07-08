/** Faction option slugs — mirror the backend. Labels come from i18n. */
export const FACTION_TYPE_OPTIONS = [
  'kingdom',
  'empire',
  'noble_house',
  'clan',
  'guild',
  'religious_order',
  'military_order',
  'mercenary_company',
  'tribe',
  'cult',
  'criminal_organization',
  'corporation',
  'custom',
] as const;

export const FACTION_SYMBOL_TYPE_OPTIONS = ['coat_of_arms', 'banner'] as const;

const KNOWN_TYPES = new Set<string>(FACTION_TYPE_OPTIONS);

/** Known slug → i18n key; unknown (custom free text) → null (show as-is). */
export function factionTypeLabelKey(type: string): string | null {
  return KNOWN_TYPES.has(type) ? `faction.type.${type}` : null;
}
