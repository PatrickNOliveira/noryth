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
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  personality: string;
  motivations: string;
  /** Master-only; null for players. */
  secrets: string | null;
  /** Master-only; null for players. */
  notes: string | null;
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
>;
