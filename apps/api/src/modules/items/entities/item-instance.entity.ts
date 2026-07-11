import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { ItemState } from '../item.constants';

/**
 * A concrete occurrence of an ItemDefinition in the campaign. Carries a simple
 * location (with a character OR on a map/point) — this is NOT a full inventory.
 */
@Entity({ name: 'item_instances' })
@Index('IDX_item_instances_campaign', ['campaignId'])
@Index('IDX_item_instances_definition', ['itemDefinitionId'])
export class ItemInstance extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'item_definition_id', type: 'uuid' })
  itemDefinitionId!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'custom_name', type: 'varchar', length: 160, nullable: true })
  customName!: string | null;

  @Column({ name: 'custom_description', type: 'text', nullable: true })
  customDescription!: string | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  state!: ItemState;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  @Column({ name: 'discovered_at', type: 'timestamptz', nullable: true })
  discoveredAt!: Date | null;

  // ── simple location (at most one primary place) ──
  @Column({ name: 'holder_character_id', type: 'uuid', nullable: true })
  holderCharacterId!: string | null;

  @Column({ name: 'map_id', type: 'uuid', nullable: true })
  mapId!: string | null;

  @Column({ name: 'map_point_of_interest_id', type: 'uuid', nullable: true })
  mapPointOfInterestId!: string | null;

  /** Master-only private notes; stripped from player-facing responses. */
  @Column({ name: 'master_notes', type: 'text', default: '' })
  masterNotes!: string;
}
