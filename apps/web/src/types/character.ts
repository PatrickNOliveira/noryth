export type CharacterImageStatus =
  | 'none'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface CharacterAttributeValue {
  attributeId: string;
  value: number;
}

export interface Character {
  id: string;
  campaignId: string;
  createdByUserId: string;
  controlledByUserId: string | null;
  isPlayerCharacter: boolean;
  attributePointsBudget: number | null;
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  personality: string;
  motivations: string;
  /** Visible to the controlling player and master. */
  secrets: string | null;
  /** Master-only free notes. */
  masterNotes: string | null;
  /** Controlling player's notes; visible to that player and master. */
  playerNotes: string | null;
  factionId: string | null;
  isVisibleToPlayers: boolean;
  imageUrl: string | null;
  imageStatus: CharacterImageStatus;
  imageError: string | null;
  attributes: CharacterAttributeValue[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  name: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  personality?: string;
  motivations?: string;
  secrets?: string;
  notes?: string;
  factionId?: string | null;
  isVisibleToPlayers?: boolean;
  attributes?: CharacterAttributeValue[];
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
}

export type UpdateCharacterInput = Partial<
  Omit<CreateCharacterInput, 'generateImage' | 'ignoreCampaignArtDirection'>
> & {
  playerNotes?: string;
  attributePointsBudget?: number | null;
};

/** A player creating their own character (no attributes/visibility/budget). */
export interface CreatePlayerCharacterInput {
  name: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  personality?: string;
  motivations?: string;
  secrets?: string;
  playerNotes?: string;
  factionId?: string | null;
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
}

export type UpdatePlayerCharacterInput = Partial<
  Omit<CreatePlayerCharacterInput, 'generateImage' | 'ignoreCampaignArtDirection'>
>;
