import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * A per-form attribute override. If a form has no value for an attribute, the
 * base character's value is used (resolution happens in the effective-stats
 * service). One value per (form, attribute).
 */
@Entity({ name: 'character_form_attribute_values' })
@Index('IDX_character_form_attr_values_form', ['characterFormId'])
@Unique('UQ_character_form_attr_value', ['characterFormId', 'attributeId'])
export class CharacterFormAttributeValue extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_form_id', type: 'uuid' })
  characterFormId!: string;

  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId!: string;

  @Column({ type: 'int' })
  value!: number;
}
