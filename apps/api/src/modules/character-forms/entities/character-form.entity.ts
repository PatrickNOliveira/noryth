import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { CharacterImageStatus } from '@modules/characters/character.constants';

/**
 * An alternative FORM of a character (human, monstrous, possessed, true form…).
 * A form is a variation of the SAME character — it never duplicates the
 * character's identity, history, inventory, faction or controller. It only
 * overrides visual/mechanical layers: appearance, image, attributes, abilities.
 */
@Entity({ name: 'character_forms' })
@Index('IDX_character_forms_character', ['characterId'])
export class CharacterForm extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 280, default: '' })
  shortDescription!: string;

  /** Required — drives the AI image of the form. */
  @Column({ name: 'appearance_description', type: 'text', default: '' })
  appearanceDescription!: string;

  /** Master-only notes; never shown to players. */
  @Column({ type: 'text', default: '' })
  notes!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  /** When true, the form inherits the base character's abilities. */
  @Column({ name: 'uses_base_abilities', type: 'boolean', default: true })
  usesBaseAbilities!: boolean;

  @Column({ name: 'image_path', type: 'varchar', length: 512, nullable: true })
  imagePath!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'image_status', type: 'varchar', length: 20, default: 'none' })
  imageStatus!: CharacterImageStatus;

  @Column({ name: 'image_error', type: 'text', nullable: true })
  imageError!: string | null;

  @Column({ name: 'image_job_id', type: 'varchar', length: 128, nullable: true })
  imageJobId!: string | null;

  @Column({ name: 'last_image_prompt', type: 'text', nullable: true })
  lastImagePrompt!: string | null;

  @Column({ name: 'last_image_negative_prompt', type: 'text', nullable: true })
  lastImageNegativePrompt!: string | null;
}
