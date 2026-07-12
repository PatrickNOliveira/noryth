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

export type AbilityCreationSource = 'PREPARATION' | 'SESSION';

export interface AbilityDefinition {
  id: string;
  campaignId: string;
  createdByUserId: string;
  /** Where it was authored (campaign prep vs. improvised in a live session). */
  creationSource?: AbilityCreationSource;
  createdDuringSessionId?: string | null;
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

// ── improvise an ability during a session ──

/** The master's partial ability sent to AI completion during a session. */
export interface ImprovisePartialAbilityInput {
  name?: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  effectDescription?: string;
  rulesText?: string;
  costDescription?: string;
  limitationDescription?: string;
  masterNotes?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
}

/** Body for AI-completing an improvised ability. */
export interface CompleteImprovisedAbilityInput {
  ability?: ImprovisePartialAbilityInput;
  instructions?: string;
  /** Character the master is focusing on (context only). */
  characterId?: string;
  /** UI locale (e.g. "en-US") — the language the AI must write completions in. */
  targetLanguage?: string;
}

/** A completed, not-yet-persisted ability draft returned for review. */
export interface ImprovisedAbilityDraft {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  effectDescription: string;
  rulesText: string;
  costDescription: string;
  limitationDescription: string;
  masterNotes: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
}

export type SessionAbilityLinkTarget = 'NONE' | 'CHARACTER' | 'ACTIVE_FORM';

/** Optional link created alongside the definition. */
export interface SessionAbilityLink {
  target: SessionAbilityLinkTarget;
  characterId?: string | null;
  formId?: string | null;
}

/** Body for creating an improvised ability (definition + optional link). */
export interface CreateSessionAbilityInput {
  ability: CreateAbilityInput;
  link?: SessionAbilityLink;
}

/** Result of creating an improvised ability. */
export interface SessionAbilityResult {
  definition: AbilityDefinition;
  linkTarget: SessionAbilityLinkTarget;
  characterId: string | null;
  formId: string | null;
}
