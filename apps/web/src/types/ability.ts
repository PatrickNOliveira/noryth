export type AbilityApprovalStatus =
  | 'PENDING_APPROVAL'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export const ABILITY_TYPES = [
  'COMBAT',
  'SOCIAL',
  'MAGIC',
  'RITUAL',
  'SPIRITUAL',
  'CURSE',
  'BLESSING',
  'LINEAGE',
  'KNOWLEDGE',
  'PASSIVE',
  'OTHER',
] as const;

export interface AbilityDefinition {
  id: string;
  campaignId: string;
  createdByUserId: string;
  proposedByUserId: string | null;
  proposedForCharacterId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectedByUserId: string | null;
  rejectedAt: string | null;
  approvalStatus: AbilityApprovalStatus;
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
  masterNotes: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterAbility {
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
  masterNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAbilityInput {
  name: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  effectDescription?: string;
  rulesText?: string;
  costDescription?: string;
  limitationDescription?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
  factionId?: string | null;
  masterNotes?: string;
}

export type UpdateAbilityInput = Partial<CreateAbilityInput>;

export interface ProposeAbilityInput {
  name: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  effectDescription?: string;
  rulesText?: string;
  costDescription?: string;
  limitationDescription?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
}

export type UpdateProposalInput = Partial<ProposeAbilityInput>;

export interface AssignAbilityInput {
  abilityDefinitionId: string;
  isVisibleToPlayers?: boolean;
  customDescription?: string;
  masterNotes?: string;
}
