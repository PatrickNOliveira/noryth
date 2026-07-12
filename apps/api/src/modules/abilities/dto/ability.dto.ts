import { AbilityDefinition } from '../entities/ability-definition.entity';
import { CharacterAbility } from '../entities/character-ability.entity';

export interface AbilityDefinitionDto {
  id: string;
  campaignId: string;
  createdByUserId: string;
  creationSource: string;
  createdDuringSessionId: string | null;
  proposedByUserId: string | null;
  proposedForCharacterId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  rejectedByUserId: string | null;
  rejectedAt: Date | null;
  approvalStatus: string;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  effectDescription: string;
  rulesText: string;
  costDescription: string;
  limitationDescription: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
  factionId: string | null;
  /** Master-only; null otherwise. */
  masterNotes: string | null;
  /** Master + the proposer; null otherwise. */
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterAbilityDto {
  id: string;
  campaignId: string;
  characterId: string;
  abilityDefinitionId: string;
  abilityName: string;
  abilityType: string;
  isUnique: boolean;
  assignedByUserId: string;
  isVisibleToPlayers: boolean;
  status: string;
  customDescription: string | null;
  /** Master-only; null otherwise. */
  masterNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @param isMaster   viewer is the master (sees everything).
 * @param isProposer viewer proposed this ability (sees the review notes).
 */
export function toAbilityDefinitionDto(
  def: AbilityDefinition,
  isMaster: boolean,
  isProposer = false,
): AbilityDefinitionDto {
  return {
    id: def.id,
    campaignId: def.campaignId,
    createdByUserId: def.createdByUserId,
    creationSource: def.creationSource,
    createdDuringSessionId: def.createdDuringSessionId,
    proposedByUserId: def.proposedByUserId,
    proposedForCharacterId: def.proposedForCharacterId,
    approvedByUserId: def.approvedByUserId,
    approvedAt: def.approvedAt,
    rejectedByUserId: def.rejectedByUserId,
    rejectedAt: def.rejectedAt,
    approvalStatus: def.approvalStatus,
    name: def.name,
    type: def.type,
    shortDescription: def.shortDescription,
    description: def.description,
    history: def.history,
    effectDescription: def.effectDescription,
    rulesText: def.rulesText,
    costDescription: def.costDescription,
    limitationDescription: def.limitationDescription,
    isUnique: def.isUnique,
    isVisibleToPlayers: def.isVisibleToPlayers,
    factionId: def.factionId,
    masterNotes: isMaster ? def.masterNotes : null,
    reviewNotes: isMaster || isProposer ? def.reviewNotes : null,
    createdAt: def.createdAt,
    updatedAt: def.updatedAt,
  };
}

export function toCharacterAbilityDto(
  link: CharacterAbility,
  def: AbilityDefinition | undefined,
  isMaster: boolean,
): CharacterAbilityDto {
  return {
    id: link.id,
    campaignId: link.campaignId,
    characterId: link.characterId,
    abilityDefinitionId: link.abilityDefinitionId,
    abilityName: def?.name ?? '—',
    abilityType: def?.type ?? '',
    isUnique: def?.isUnique ?? false,
    assignedByUserId: link.assignedByUserId,
    isVisibleToPlayers: link.isVisibleToPlayers,
    status: link.status,
    customDescription: link.customDescription,
    masterNotes: isMaster ? link.masterNotes : null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
