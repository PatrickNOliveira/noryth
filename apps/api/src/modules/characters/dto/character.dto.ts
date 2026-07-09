import { Character } from '../entities/character.entity';
import { CharacterAttributeValue } from '../entities/character-attribute-value.entity';

export interface CharacterAttributeValueDto {
  attributeId: string;
  value: number;
}

export interface CharacterDto {
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
  /** Master-only; null for player-facing responses. */
  secrets: string | null;
  /** Master-only; null for player-facing responses. */
  notes: string | null;
  factionId: string | null;
  isVisibleToPlayers: boolean;
  imageUrl: string | null;
  imageStatus: string;
  imageError: string | null;
  attributes: CharacterAttributeValueDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @param includePrivate whether to expose master-only fields (secrets, notes).
 *        Pass the "is the viewer the master?" result.
 */
export function toCharacterDto(
  character: Character,
  values: CharacterAttributeValue[],
  includePrivate: boolean,
): CharacterDto {
  return {
    id: character.id,
    campaignId: character.campaignId,
    createdByUserId: character.createdByUserId,
    name: character.name,
    title: character.title,
    shortDescription: character.shortDescription,
    description: character.description,
    history: character.history,
    appearance: character.appearance,
    personality: character.personality,
    motivations: character.motivations,
    secrets: includePrivate ? character.secrets : null,
    notes: includePrivate ? character.notes : null,
    factionId: character.factionId,
    isVisibleToPlayers: character.isVisibleToPlayers,
    imageUrl: character.imageUrl,
    imageStatus: character.imageStatus,
    imageError: character.imageError,
    attributes: values.map((v) => ({
      attributeId: v.attributeId,
      value: v.value,
    })),
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  };
}
