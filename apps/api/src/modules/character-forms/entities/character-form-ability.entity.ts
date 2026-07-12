import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * An ability granted specifically by a form (used only when the form's
 * `usesBaseAbilities` is false). One row per (form, ability definition).
 */
@Entity({ name: 'character_form_abilities' })
@Index('IDX_character_form_abilities_form', ['characterFormId'])
@Unique('UQ_character_form_ability', ['characterFormId', 'abilityDefinitionId'])
export class CharacterFormAbility extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_form_id', type: 'uuid' })
  characterFormId!: string;

  @Column({ name: 'ability_definition_id', type: 'uuid' })
  abilityDefinitionId!: string;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;
}
