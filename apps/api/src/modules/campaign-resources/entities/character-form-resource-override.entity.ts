import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * A per-form override of a resource's MAXIMUM. When a form has no override for a
 * resource, the character's base maximum is used (resolution happens in the
 * effective-resources service). For MVP a form only overrides the max, never the
 * current value. One row per (form, resource).
 */
@Entity({ name: 'character_form_resource_overrides' })
@Index('IDX_character_form_resource_overrides_form', ['characterFormId'])
@Unique('UQ_character_form_resource_override', [
  'characterFormId',
  'resourceDefinitionId',
])
export class CharacterFormResourceOverride extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_form_id', type: 'uuid' })
  characterFormId!: string;

  @Column({ name: 'resource_definition_id', type: 'uuid' })
  resourceDefinitionId!: string;

  @Column({ name: 'max_value', type: 'int' })
  maxValue!: number;
}
