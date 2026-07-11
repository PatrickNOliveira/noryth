import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { CharacterAbilityStatus } from '../ability.constants';

/** The link between a character and an (approved) ability. */
@Entity({ name: 'character_abilities' })
@Index('IDX_character_abilities_character', ['characterId'])
@Index('IDX_character_abilities_definition', ['abilityDefinitionId'])
export class CharacterAbility extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  @Column({ name: 'ability_definition_id', type: 'uuid' })
  abilityDefinitionId!: string;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: CharacterAbilityStatus;

  @Column({ name: 'custom_description', type: 'text', nullable: true })
  customDescription!: string | null;

  /** Master-only private notes; never shown to players. */
  @Column({ name: 'master_notes', type: 'text', default: '' })
  masterNotes!: string;
}
