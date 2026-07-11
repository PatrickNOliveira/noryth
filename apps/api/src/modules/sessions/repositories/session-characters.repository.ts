import { SessionCharacter } from '../entities/session-character.entity';
import { CharacterSessionSprite } from '../entities/character-session-sprite.entity';

/**
 * Persistence PORT for placed session characters and their session sprites. The
 * services depend on this interface; the TypeORM adapter implements it.
 */
export interface SessionCharactersRepository {
  // ── placed characters ──
  create(data: Partial<SessionCharacter>): SessionCharacter;
  save(entity: SessionCharacter): Promise<SessionCharacter>;
  remove(entity: SessionCharacter): Promise<void>;
  findById(id: string): Promise<SessionCharacter | null>;
  findBySessionAndMap(sessionId: string, mapId: string): Promise<SessionCharacter[]>;
  findByCharacterInMap(
    sessionId: string,
    mapId: string,
    characterId: string,
  ): Promise<SessionCharacter | null>;
  exists(sessionId: string, mapId: string, characterId: string): Promise<boolean>;
  /** Deletes every placed character of a session; returns the removed ids. */
  deleteBySession(sessionId: string): Promise<string[]>;

  // ── session sprites ──
  createSprite(data: Partial<CharacterSessionSprite>): CharacterSessionSprite;
  saveSprite(sprite: CharacterSessionSprite): Promise<CharacterSessionSprite>;
  findSpriteById(id: string): Promise<CharacterSessionSprite | null>;
  findSpritesByCharacter(characterId: string): Promise<CharacterSessionSprite[]>;
  findSpriteByCharacterAndDirection(
    characterId: string,
    direction: string,
  ): Promise<CharacterSessionSprite | null>;
  findSpritesByCharacters(
    characterIds: string[],
  ): Promise<CharacterSessionSprite[]>;
}

/** DI token used to inject a {@link SessionCharactersRepository}. */
export const SESSION_CHARACTERS_REPOSITORY = Symbol(
  'SESSION_CHARACTERS_REPOSITORY',
);
