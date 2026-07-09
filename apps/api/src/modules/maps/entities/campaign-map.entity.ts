import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { MapImageStatus } from '../map.constants';

/**
 * A campaign map. Belongs to a campaign, may have a parent map (hierarchy) of
 * the SAME campaign, its own art direction (complements the campaign-wide map
 * art direction), and inline async-generated image state.
 */
@Entity({ name: 'campaign_maps' })
@Index('IDX_campaign_maps_campaign', ['campaignId'])
@Index('IDX_campaign_maps_parent', ['parentMapId'])
export class CampaignMap extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'parent_map_id', type: 'uuid', nullable: true })
  parentMapId!: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** Free scale/type (WORLD, CITY, DUNGEON…), stored as a string. */
  @Column({ type: 'varchar', length: 40, default: '' })
  type!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 280, default: '' })
  shortDescription!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'text', default: '' })
  history!: string;

  /** Master-only private notes; stripped from player-facing responses. */
  @Column({ type: 'text', default: '' })
  notes!: string;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  /** Map-specific art direction; complements the campaign map art direction. */
  @Column({ name: 'art_direction', type: 'text', default: '' })
  artDirection!: string;

  @Column({ name: 'image_path', type: 'varchar', length: 512, nullable: true })
  imagePath!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'image_status', type: 'varchar', length: 20, default: 'none' })
  imageStatus!: MapImageStatus;

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

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;
}
