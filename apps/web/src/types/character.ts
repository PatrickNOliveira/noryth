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

export type CharacterCreationSource = 'PREPARATION' | 'SESSION';

export interface Character {
  id: string;
  campaignId: string;
  createdByUserId: string;
  /** Where it was authored (campaign prep vs. improvised in a live session). */
  creationSource?: CharacterCreationSource;
  createdDuringSessionId?: string | null;
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

/** The master's partial character sent to AI completion during a session. */
export interface ImprovisePartialCharacterInput {
  name?: string;
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
  attributes?: CharacterAttributeValue[];
}

/** Body for AI-completing an improvised character. */
export interface CompleteImprovisedCharacterInput {
  character?: ImprovisePartialCharacterInput;
  instructions?: string;
  /** UI locale (e.g. "en-US") — the language the AI must write completions in. */
  targetLanguage?: string;
}

/** A completed, not-yet-persisted character draft returned for review. */
export interface ImprovisedCharacterDraft {
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  personality: string;
  motivations: string;
  secrets: string;
  notes: string;
  factionId: string | null;
  attributes: CharacterAttributeValue[];
}

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
