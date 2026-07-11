export type ItemImageStatus =
  | 'none'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export const ITEM_TYPES = [
  'WEAPON',
  'ARMOR',
  'CONSUMABLE',
  'RELIC',
  'DOCUMENT',
  'KEY',
  'TREASURE',
  'MAGIC_ITEM',
  'TOOL',
  'MISC',
  'OTHER',
] as const;

export const ITEM_STATES = [
  'AVAILABLE',
  'HIDDEN',
  'CARRIED',
  'FOUND',
  'CONSUMED',
  'DESTROYED',
  'LOST',
] as const;

export interface ItemDefinition {
  id: string;
  campaignId: string;
  createdByUserId: string;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  effectDescription: string;
  rulesText: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
  /** Master-only; null for players. */
  masterNotes: string | null;
  imageUrl: string | null;
  imageStatus: ItemImageStatus;
  imageError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemInstance {
  id: string;
  campaignId: string;
  itemDefinitionId: string;
  customName: string | null;
  customDescription: string | null;
  quantity: number;
  state: string;
  isVisibleToPlayers: boolean;
  discoveredAt: string | null;
  holderCharacterId: string | null;
  mapId: string | null;
  mapPointOfInterestId: string | null;
  /** Master-only; null for players. */
  masterNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDefinitionInput {
  name: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  effectDescription?: string;
  rulesText?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
  masterNotes?: string;
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
}

export type UpdateItemDefinitionInput = Partial<
  Omit<CreateItemDefinitionInput, 'generateImage' | 'ignoreCampaignArtDirection'>
>;

export interface CreateItemInstanceInput {
  itemDefinitionId: string;
  customName?: string | null;
  customDescription?: string | null;
  quantity?: number;
  state?: string;
  isVisibleToPlayers?: boolean;
  holderCharacterId?: string | null;
  mapId?: string | null;
  mapPointOfInterestId?: string | null;
  masterNotes?: string;
}

export type UpdateItemInstanceInput = Partial<
  Omit<CreateItemInstanceInput, 'itemDefinitionId'>
>;
