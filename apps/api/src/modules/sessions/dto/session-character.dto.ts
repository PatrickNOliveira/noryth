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
  /** Per-direction sprite state (FRONT/BACK) for the frontend to pick + placeholder. */
  sprites: SpriteView[];
  createdAt: Date;
  updatedAt: Date;
}

export function toSessionCharacterDto(
  entity: SessionCharacter,
  characterName: string,
  isPlayerCharacter: boolean,
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
    sprites,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
