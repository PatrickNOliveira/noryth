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

export type ItemCreationSource = 'PREPARATION' | 'SESSION';

export interface ItemDefinition {
  id: string;
  campaignId: string;
  createdByUserId: string;
  /** Where it was authored (campaign prep vs. improvised in a live session). */
  creationSource?: ItemCreationSource;
  createdDuringSessionId?: string | null;
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

// ── session item management ──

/** A definition plus how many instances of it exist (session items list). */
export interface ItemDefinitionListItem extends ItemDefinition {
  instanceCount: number;
}

/** A definition with all its instances (session item sheet). */
export interface ItemSessionDetail {
  definition: ItemDefinition;
  instances: ItemInstance[];
}

/** Give an item to a character (creates/transfers an instance). */
export interface GiveItemToCharacterInput {
  characterId: string;
  quantity?: number;
}

// ── improvise an item during a session ──

/** The master's partial item sent to AI completion during a session. */
export interface ImprovisePartialItemInput {
  name?: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  effectDescription?: string;
  rulesText?: string;
  masterNotes?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
}

/** Body for AI-completing an improvised item. */
export interface CompleteImprovisedItemInput {
  item?: ImprovisePartialItemInput;
  instructions?: string;
  /** UI locale (e.g. "en-US") — the language the AI must write completions in. */
  targetLanguage?: string;
}

/** A completed, not-yet-persisted item draft returned for review. */
export interface ImprovisedItemDraft {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  effectDescription: string;
  rulesText: string;
  masterNotes: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
}

/** Optional first occurrence created alongside the definition. */
export interface SessionItemInstanceInput {
  create?: boolean;
  quantity?: number;
  state?: string;
  holderCharacterId?: string | null;
  mapId?: string | null;
  mapPointOfInterestId?: string | null;
  isVisibleToPlayers?: boolean;
  masterNotes?: string;
}

/** Body for creating an improvised item (definition + optional first instance). */
export interface CreateSessionItemInput {
  item: CreateItemDefinitionInput;
  instance?: SessionItemInstanceInput;
}

/** Result of creating an improvised item. */
export interface SessionItemResult {
  definition: ItemDefinition;
  instance: ItemInstance | null;
}
