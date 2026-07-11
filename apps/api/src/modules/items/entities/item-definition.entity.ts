import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { ItemImageStatus } from '../item.constants';

/**
 * The concept/base of an item (e.g. "Poção de Sangue Negro"). Holds lore, rules
 * and the async-generated base image. Concrete occurrences live in ItemInstance.
 */
@Entity({ name: 'item_definitions' })
@Index('IDX_item_definitions_campaign', ['campaignId'])
export class ItemDefinition extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  type!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 280, default: '' })
  shortDescription!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'text', default: '' })
  history!: string;

  @Column({ type: 'text', default: '' })
  appearance!: string;

  @Column({ name: 'effect_description', type: 'text', default: '' })
  effectDescription!: string;

  @Column({ name: 'rules_text', type: 'text', default: '' })
  rulesText!: string;

  @Column({ name: 'is_unique', type: 'boolean', default: false })
  isUnique!: boolean;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  /** Master-only private notes; stripped from player-facing responses. */
  @Column({ name: 'master_notes', type: 'text', default: '' })
  masterNotes!: string;

  @Column({ name: 'image_path', type: 'varchar', length: 512, nullable: true })
  imagePath!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'image_status', type: 'varchar', length: 20, default: 'none' })
  imageStatus!: ItemImageStatus;

  @Column({ name: 'image_error', type: 'text', nullable: true })
  imageError!: string | null;

  @Column({ name: 'image_job_id', type: 'varchar', length: 128, nullable: true })
  imageJobId!: string | null;

  @Column({ name: 'last_image_prompt', type: 'text', nullable: true })
  lastImagePrompt!: string | null;

  @Column({ name: 'last_image_negative_prompt', type: 'text', nullable: true })
  lastImageNegativePrompt!: string | null;

  @Column({ name: 'last_image_adjustment', type: 'text', nullable: true })
  lastImageAdjustment!: string | null;
}
