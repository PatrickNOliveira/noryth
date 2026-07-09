import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * A point of interest inside a map (a landmark, secret or marker). Coordinates
 * are OPTIONAL and stored as percentages (0–100) so they survive image resizes.
 */
@Entity({ name: 'map_points' })
@Index('IDX_map_points_map', ['mapId'])
export class MapPoint extends BaseEntity {
  @Column({ name: 'map_id', type: 'uuid' })
  mapId!: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  /** Master-only private notes; stripped from player-facing responses. */
  @Column({ type: 'text', default: '' })
  notes!: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  type!: string;

  /** Percentage 0–100 on the map image; null when unplaced. */
  @Column({ type: 'double precision', nullable: true })
  x!: number | null;

  @Column({ type: 'double precision', nullable: true })
  y!: number | null;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  /**
   * Whether to draw this point's name as a deterministic label overlay on the
   * map image — the recommended path for reliable text (vs. AI-drawn labels).
   */
  @Column({ name: 'show_label_on_map', type: 'boolean', default: false })
  showLabelOnMap!: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;
}
