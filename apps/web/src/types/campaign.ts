export type CampaignVisibility = 'private' | 'unlisted' | 'public';
export type CampaignStatus = 'active' | 'paused' | 'archived';

/** Public campaign shape returned by the API (never includes the password). */
export interface Campaign {
  id: string;
  ownerId: string;
  masterId: string;
  name: string;
  theme: string;
  shortDescription: string;
  premise: string;
  tone: string;
  mainLanguage: string;
  visibility: CampaignVisibility;
  hasPassword: boolean;
  maxPlayers: number | null;
  coverImageUrl: string | null;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Minimal campaign view for discovery and the join screen — reachable by any
 * authenticated user (never exposes the premise or password).
 */
export interface CampaignSummary {
  id: string;
  name: string;
  shortDescription: string;
  theme: string;
  tone: string;
  coverImageUrl: string | null;
  visibility: CampaignVisibility;
  status: CampaignStatus;
  hasPassword: boolean;
  maxPlayers: number | null;
  playerCount: number;
  isParticipant: boolean;
  isFull: boolean;
}

/** Everything the create form collects. `coverImage` is a File, never base64. */
export interface CreateCampaignInput {
  name: string;
  theme: string;
  customTheme?: string;
  shortDescription: string;
  premise: string;
  tone: string;
  customTone?: string;
  mainLanguage: string;
  visibility: CampaignVisibility;
  password?: string;
  maxPlayers?: number;
  coverImage?: File | null;
}
