import { AbilityDefinition } from '../entities/ability-definition.entity';
import { CharacterAbility } from '../entities/character-ability.entity';

/**
 * Persistence PORT for ability definitions and character-ability links. The
 * service depends on this interface; the TypeORM adapter implements it.
 */
export interface AbilitiesRepository {
  // ── definitions ──
  createDefinition(data: Partial<AbilityDefinition>): AbilityDefinition;
  saveDefinition(def: AbilityDefinition): Promise<AbilityDefinition>;
  removeDefinition(def: AbilityDefinition): Promise<void>;
  findDefinitionById(id: string): Promise<AbilityDefinition | null>;
  findDefinitionsByCampaign(campaignId: string): Promise<AbilityDefinition[]>;
  /** Proposals awaiting review (PENDING_APPROVAL or CHANGES_REQUESTED). */
  findPendingDefinitions(campaignId: string): Promise<AbilityDefinition[]>;

  // ── character links ──
  createLink(data: Partial<CharacterAbility>): CharacterAbility;
  saveLink(link: CharacterAbility): Promise<CharacterAbility>;
  removeLink(link: CharacterAbility): Promise<void>;
  findLinkById(id: string): Promise<CharacterAbility | null>;
  findLinksByCharacter(characterId: string): Promise<CharacterAbility[]>;
  findLinksByDefinition(definitionId: string): Promise<CharacterAbility[]>;
  existsLink(characterId: string, definitionId: string): Promise<boolean>;
  /** Active links of a definition — used for the per-campaign uniqueness rule. */
  countActiveLinksByDefinition(definitionId: string): Promise<number>;
}

/** DI token used to inject an {@link AbilitiesRepository}. */
export const ABILITIES_REPOSITORY = Symbol('ABILITIES_REPOSITORY');
