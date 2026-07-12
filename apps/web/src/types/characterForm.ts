import { CharacterImageStatus } from './character';

export interface FormAttributeValue {
  attributeId: string;
  value: number;
}
export interface FormAbility {
  abilityDefinitionId: string;
  isVisibleToPlayers: boolean;
}

export interface CharacterForm {
  id: string;
  campaignId: string;
  characterId: string;
  name: string;
  shortDescription: string;
  appearanceDescription: string;
  notes: string;
  isDefault: boolean;
  isActive: boolean;
  usesBaseAbilities: boolean;
  imageUrl: string | null;
  imageStatus: CharacterImageStatus;
  imageError: string | null;
  attributes: FormAttributeValue[];
  abilities: FormAbility[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterFormInput {
  name: string;
  shortDescription?: string;
  appearanceDescription: string;
  notes?: string;
  usesBaseAbilities?: boolean;
}

export type UpdateCharacterFormInput = Partial<CreateCharacterFormInput>;
