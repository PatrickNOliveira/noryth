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
  /** Visible to the controlling player and the master. */
  secrets: string | null;
  /** Master-only free notes; never shown to players (incl. the controller). */
  masterNotes: string | null;
  /** The controlling player's notes; visible to that player and the master. */
  playerNotes: string | null;
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
 * @param isMaster     viewer is the campaign master (sees everything).
 * @param isController viewer controls this character (sees their own private
 *                     fields, but never the master notes).
 */
export function toCharacterDto(
  character: Character,
  values: CharacterAttributeValue[],
  isMaster: boolean,
  isController = false,
): CharacterDto {
  const privileged = isMaster || isController;
  return {
    id: character.id,
    campaignId: character.campaignId,
    createdByUserId: character.createdByUserId,
    controlledByUserId: character.controlledByUserId,
    isPlayerCharacter: character.isPlayerCharacter,
    attributePointsBudget: character.attributePointsBudget,
    name: character.name,
    title: character.title,
    shortDescription: character.shortDescription,
    description: character.description,
    history: character.history,
    appearance: character.appearance,
    personality: character.personality,
    motivations: character.motivations,
    secrets: privileged ? character.secrets : null,
    masterNotes: isMaster ? character.notes : null,
    playerNotes: privileged ? character.playerNotes : null,
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
