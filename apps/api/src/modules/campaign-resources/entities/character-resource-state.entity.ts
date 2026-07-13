import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * A character's current state for one campaign resource: the current value and
 * the character's BASE maximum (which may differ from the campaign default and
 * may be further overridden by an active form's
 * {@link CharacterFormResourceOverride}). One row per (character, resource).
 */
@Entity({ name: 'character_resource_states' })
@Index('IDX_character_resource_states_character', ['characterId'])
@Unique('UQ_character_resource_state', ['characterId', 'resourceDefinitionId'])
export class CharacterResourceState extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  @Column({ name: 'resource_definition_id', type: 'uuid' })
  resourceDefinitionId!: string;

  @Column({ name: 'current_value', type: 'int' })
  currentValue!: number;

  @Column({ name: 'max_value', type: 'int' })
  maxValue!: number;
}
