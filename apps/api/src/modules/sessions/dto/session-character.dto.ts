import { SessionCharacter } from '../entities/session-character.entity';
import { SpriteView } from '../services/character-session-sprite.service';

/** A placed session character, with its sprites, for the session viewport. */
export interface SessionCharacterDto {
  id: string;
  campaignId: string;
  sessionId: string;
  mapId: string;
  characterId: string;
  characterName: string;
  x: number;
  y: number;
  facing: string;
  sizeScale: number;
  isVisibleToPlayers: boolean;
  /** Whether the placed character is a player character (vs. a master NPC). */
  isPlayerCharacter: boolean;
  /** The active form driving the effective sprite (null only if a character has none). */
  activeForm: { id: string; name: string; imageUrl: string | null } | null;
  /** How many forms the character has (the frontend hides "change form" when ≤1). */
  formsCount: number;
  /**
   * Per-direction sprite state (FRONT/BACK) of the ACTIVE FORM, for the frontend
   * to pick by facing + show a placeholder while it generates.
   */
  sprites: SpriteView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveFormSummary {
  id: string;
  name: string;
  imageUrl: string | null;
}

export function toSessionCharacterDto(
  entity: SessionCharacter,
  characterName: string,
  isPlayerCharacter: boolean,
  activeForm: ActiveFormSummary | null,
  formsCount: number,
  sprites: SpriteView[],
): SessionCharacterDto {
  return {
    id: entity.id,
    campaignId: entity.campaignId,
    sessionId: entity.sessionId,
    mapId: entity.mapId,
    characterId: entity.characterId,
    characterName,
    x: entity.x,
    y: entity.y,
    facing: entity.facing,
    sizeScale: entity.sizeScale,
    isVisibleToPlayers: entity.isVisibleToPlayers,
    isPlayerCharacter,
    activeForm,
    formsCount,
    sprites,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
