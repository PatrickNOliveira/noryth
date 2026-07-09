import { Character } from '../entities/character.entity';
import { CharacterAttributeValue } from '../entities/character-attribute-value.entity';

/** A value to persist for a character attribute. */
export interface AttributeValueInput {
  attributeId: string;
  value: number;
}

/**
 * Persistence PORT for characters and their attribute values. The service
 * depends on this interface; the TypeORM adapter implements it.
 */
export interface CharactersRepository {
  createCharacter(data: Partial<Character>): Character;
  saveCharacter(character: Character): Promise<Character>;
  removeCharacter(character: Character): Promise<void>;
  findById(id: string): Promise<Character | null>;
  findByCampaign(campaignId: string): Promise<Character[]>;
  findVisibleByCampaign(campaignId: string): Promise<Character[]>;

  findValues(characterId: string): Promise<CharacterAttributeValue[]>;
  /** Replaces ALL attribute values of a character with the given set. */
  replaceValues(
    characterId: string,
    values: AttributeValueInput[],
  ): Promise<CharacterAttributeValue[]>;
}

/** DI token used to inject a {@link CharactersRepository}. */
export const CHARACTERS_REPOSITORY = Symbol('CHARACTERS_REPOSITORY');
