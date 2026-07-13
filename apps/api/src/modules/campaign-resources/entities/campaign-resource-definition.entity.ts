import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { ResourceCurrentStrategy, ResourceType } from '../resource.constants';

/**
 * A character resource defined at the campaign level (Vida, Mana, Sanidade…).
 * Every character in the campaign holds a {@link CharacterResourceState} for each
 * of these. There is NO fixed/hardcoded resource list — the master defines them
 * freely per campaign. Names are unique per campaign (enforced in the service).
 */
@Entity({ name: 'campaign_resource_definitions' })
@Index('IDX_campaign_resource_definitions_campaign', ['campaignId'])
export class CampaignResourceDefinition extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 16, default: 'POOL' })
  type!: ResourceType;

  @Column({ name: 'min_value', type: 'int', default: 0 })
  minValue!: number;

  @Column({ name: 'default_max_value', type: 'int' })
  defaultMaxValue!: number;

  @Column({
    name: 'default_current_value_strategy',
    type: 'varchar',
    length: 16,
    default: 'MAX',
  })
  defaultCurrentValueStrategy!: ResourceCurrentStrategy;

  /** Only used when the strategy is CUSTOM. */
  @Column({ name: 'default_current_value', type: 'int', nullable: true })
  defaultCurrentValue!: number | null;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  /** Ascending display position; ties broken by createdAt. */
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;
}
