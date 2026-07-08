/**
 * Allowed values for a faction. Types are stored as stable slugs; the frontend
 * maps them to i18n labels.
 */
export const FACTION_TYPES = [
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
export type FactionType = (typeof FACTION_TYPES)[number];

export const FACTION_SYMBOL_TYPES = ['coat_of_arms', 'banner'] as const;
export type FactionSymbolType = (typeof FACTION_SYMBOL_TYPES)[number];

export const FACTION_STATUSES = [
  'draft',
  'generating_symbol',
  'pending_approval',
  'active',
  'generation_failed',
  'archived',
] as const;
export type FactionStatus = (typeof FACTION_STATUSES)[number];

export const FACTION_IMAGE_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'approved',
  'rejected',
] as const;
export type FactionImageStatus = (typeof FACTION_IMAGE_STATUSES)[number];

/** Job name for the async faction symbol generation. */
export const GENERATE_FACTION_SYMBOL_JOB = 'generate-faction-symbol';

export interface GenerateFactionSymbolPayload {
  factionId: string;
  requestedBy: string;
  adjustmentPrompt?: string;
}

/** Realtime room names (Socket.IO / RealtimeProvider). */
export const factionRoom = (factionId: string): string => `faction:${factionId}`;
export const campaignRoom = (campaignId: string): string => `campaign:${campaignId}`;

/** Realtime event names emitted for faction symbol generation. */
export const FACTION_IMAGE_EVENTS = {
  processing: 'faction.image.processing',
  completed: 'faction.image.completed',
  failed: 'faction.image.failed',
} as const;
