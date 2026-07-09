import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * A character's value for one of the campaign's configured attributes. Bounded
 * at write time by the attribute's [minValue, maxValue]. At most one row per
 * (character, attribute).
 */
@Entity({ name: 'character_attribute_values' })
@Index('IDX_character_attr_values_character', ['characterId'])
@Index('UQ_character_attr_values_char_attr', ['characterId', 'attributeId'], {
  unique: true,
})
export class CharacterAttributeValue extends BaseEntity {
  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  @Column({ name: 'attribute_id', type: 'uuid' })
  attributeId!: string;

  @Column({ type: 'int' })
  value!: number;
}
