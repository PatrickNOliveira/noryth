import { CampaignResourceDefinition } from '../entities/campaign-resource-definition.entity';
import { CharacterResourceState } from '../entities/character-resource-state.entity';
import { CharacterFormResourceOverride } from '../entities/character-form-resource-override.entity';

/** One form override input (max only). */
export interface FormResourceOverrideInput {
  resourceDefinitionId: string;
  maxValue: number;
}

/**
 * Persistence PORT for campaign resources — definitions, per-character states and
 * per-form max overrides. The services depend on this interface; the TypeORM
 * adapter implements it. Domain logic stays ORM-free.
 */
export interface CampaignResourcesRepository {
  // ── definitions ──
  createDefinition(
    data: Partial<CampaignResourceDefinition>,
  ): CampaignResourceDefinition;
  saveDefinition(
    def: CampaignResourceDefinition,
  ): Promise<CampaignResourceDefinition>;
  removeDefinition(def: CampaignResourceDefinition): Promise<void>;
  findDefinitionById(id: string): Promise<CampaignResourceDefinition | null>;
  /** Ordered by displayOrder ASC, then createdAt ASC. */
  findDefinitionsByCampaign(
    campaignId: string,
  ): Promise<CampaignResourceDefinition[]>;
  /** Case-insensitive lookup used to enforce per-campaign name uniqueness. */
  findDefinitionByNameInCampaign(
    campaignId: string,
    name: string,
  ): Promise<CampaignResourceDefinition | null>;
  maxDisplayOrder(campaignId: string): Promise<number | null>;

  // ── character states ──
  createState(data: Partial<CharacterResourceState>): CharacterResourceState;
  saveState(state: CharacterResourceState): Promise<CharacterResourceState>;
  saveStates(
    states: CharacterResourceState[],
  ): Promise<CharacterResourceState[]>;
  findStatesByCharacter(characterId: string): Promise<CharacterResourceState[]>;
  findStateByCharacterAndDefinition(
    characterId: string,
    resourceDefinitionId: string,
  ): Promise<CharacterResourceState | null>;
  /** Deletes every character state that references a definition (cascade on remove). */
  deleteStatesByDefinition(resourceDefinitionId: string): Promise<void>;

  // ── form overrides ──
  findOverridesByForm(formId: string): Promise<CharacterFormResourceOverride[]>;
  replaceOverridesForForm(
    formId: string,
    campaignId: string,
    overrides: FormResourceOverrideInput[],
  ): Promise<CharacterFormResourceOverride[]>;
  /** Deletes every form override that references a definition (cascade on remove). */
  deleteOverridesByDefinition(resourceDefinitionId: string): Promise<void>;
}

/** DI token used to inject a {@link CampaignResourcesRepository}. */
export const CAMPAIGN_RESOURCES_REPOSITORY = Symbol(
  'CAMPAIGN_RESOURCES_REPOSITORY',
);
