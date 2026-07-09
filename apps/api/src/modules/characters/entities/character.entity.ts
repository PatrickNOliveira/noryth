import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { CharacterImageStatus } from '../character.constants';

/**
 * A master-authored campaign character (NPC in the broad sense). Belongs to a
 * campaign, may optionally link to a faction of the SAME campaign, and carries
 * its own async-generated portrait state inline. Attribute values live in
 * {@link CharacterAttributeValue}.
 *
 * Note the absence of any ally/enemy/villain field — that is intentional.
 */
@Entity({ name: 'characters' })
@Index('IDX_characters_campaign', ['campaignId'])
export class Character extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 160, default: '' })
  title!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 280, default: '' })
  shortDescription!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'text', default: '' })
  history!: string;

  @Column({ type: 'text', default: '' })
  appearance!: string;

  @Column({ type: 'text', default: '' })
  personality!: string;

  @Column({ type: 'text', default: '' })
  motivations!: string;

  /** Master-only private info; stripped from player-facing responses. */
  @Column({ type: 'text', default: '' })
  secrets!: string;

  /** Master-only free notes; stripped from player-facing responses. */
  @Column({ type: 'text', default: '' })
  notes!: string;

  @Column({ name: 'faction_id', type: 'uuid', nullable: true })
  factionId!: string | null;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

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

  /** Prompt used for the most recent portrait generation (audit/debug). */
  @Column({ name: 'last_image_prompt', type: 'text', nullable: true })
  lastImagePrompt!: string | null;

  @Column({ name: 'last_image_negative_prompt', type: 'text', nullable: true })
  lastImageNegativePrompt!: string | null;

  /** The master's adjustment text applied to the most recent generation. */
  @Column({ name: 'last_image_adjustment', type: 'text', nullable: true })
  lastImageAdjustment!: string | null;
}
