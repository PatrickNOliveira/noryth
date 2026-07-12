import { CharacterForm } from '../entities/character-form.entity';
import { CharacterFormAttributeValue } from '../entities/character-form-attribute-value.entity';
import { CharacterFormAbility } from '../entities/character-form-ability.entity';
import { CharacterFormSessionSprite } from '../entities/character-form-session-sprite.entity';

export interface FormAttributeInput {
  attributeId: string;
  value: number;
}
export interface FormAbilityInput {
  abilityDefinitionId: string;
  isVisibleToPlayers: boolean;
}

/**
 * Persistence PORT for character forms and their attribute/ability overrides.
 * The service depends on this interface; the TypeORM adapter implements it.
 */
export interface CharacterFormsRepository {
  // ── forms ──
  create(data: Partial<CharacterForm>): CharacterForm;
  save(form: CharacterForm): Promise<CharacterForm>;
  remove(form: CharacterForm): Promise<void>;
  findById(id: string): Promise<CharacterForm | null>;
  findByCharacter(characterId: string): Promise<CharacterForm[]>;
  countByCharacter(characterId: string): Promise<number>;
  findDefault(characterId: string): Promise<CharacterForm | null>;
  findActive(characterId: string): Promise<CharacterForm | null>;
  /** Clears the default flag on all of a character's forms. */
  clearDefault(characterId: string): Promise<void>;
  /** Clears the active flag on all of a character's forms. */
  clearActive(characterId: string): Promise<void>;

  // ── attribute overrides ──
  findValues(formId: string): Promise<CharacterFormAttributeValue[]>;
  replaceValues(
    formId: string,
    campaignId: string,
    values: FormAttributeInput[],
  ): Promise<CharacterFormAttributeValue[]>;

  // ── ability grants ──
  findAbilities(formId: string): Promise<CharacterFormAbility[]>;
  replaceAbilities(
    formId: string,
    campaignId: string,
    abilities: FormAbilityInput[],
  ): Promise<CharacterFormAbility[]>;

  // ── session sprites (per form + direction) ──
  createSprite(data: Partial<CharacterFormSessionSprite>): CharacterFormSessionSprite;
  saveSprite(sprite: CharacterFormSessionSprite): Promise<CharacterFormSessionSprite>;
  findSpriteById(id: string): Promise<CharacterFormSessionSprite | null>;
  findSpritesByForm(formId: string): Promise<CharacterFormSessionSprite[]>;
  findSpriteByFormDirection(
    formId: string,
    direction: string,
  ): Promise<CharacterFormSessionSprite | null>;
}

/** DI token used to inject a {@link CharacterFormsRepository}. */
export const CHARACTER_FORMS_REPOSITORY = Symbol('CHARACTER_FORMS_REPOSITORY');
