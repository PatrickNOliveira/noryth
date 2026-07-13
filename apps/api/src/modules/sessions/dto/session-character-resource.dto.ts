import { CharacterResourceDto } from '@modules/campaign-resources/dto/character-resource.dto';
import { CampaignSession } from '../entities/campaign-session.entity';
import { SessionCharacter } from '../entities/session-character.entity';

/**
 * Result of a session resource adjustment — the updated effective resource,
 * enriched with the session/placement context. Doubles as the realtime payload
 * (with `originUserId`/`clientMutationId`) so a single shape flows both to the
 * caller's response and to other connected clients.
 */
export interface SessionCharacterResourceDto {
  tableId: string;
  sessionId: string;
  sessionCharacterId: string;
  characterId: string;
  resourceDefinitionId: string;
  name: string;
  /** Displayed current = effective current after the clamp. */
  currentValue: number;
  /** Displayed max = effective max (active-form override or base). */
  maxValue: number;
  baseCurrentValue: number;
  baseMaxValue: number;
  effectiveCurrentValue: number;
  effectiveMaxValue: number;
  isOverriddenByActiveForm: boolean;
  isVisibleToPlayers: boolean;
  originUserId: string;
  clientMutationId: string | null;
}

/** Maps the effective resource + session context into the transport shape. */
export function toSessionCharacterResourceDto(
  session: CampaignSession,
  sessionCharacter: SessionCharacter,
  resource: CharacterResourceDto,
  originUserId: string,
  clientMutationId: string | null,
): SessionCharacterResourceDto {
  return {
    tableId: sessionCharacter.campaignId,
    sessionId: session.id,
    sessionCharacterId: sessionCharacter.id,
    characterId: sessionCharacter.characterId,
    resourceDefinitionId: resource.resourceDefinitionId,
    name: resource.name,
    currentValue: resource.effectiveCurrentValue,
    maxValue: resource.effectiveMaxValue,
    baseCurrentValue: resource.currentValue,
    baseMaxValue: resource.baseMaxValue,
    effectiveCurrentValue: resource.effectiveCurrentValue,
    effectiveMaxValue: resource.effectiveMaxValue,
    isOverriddenByActiveForm: resource.isOverriddenByActiveForm,
    isVisibleToPlayers: resource.isVisibleToPlayers,
    originUserId,
    clientMutationId,
  };
}
