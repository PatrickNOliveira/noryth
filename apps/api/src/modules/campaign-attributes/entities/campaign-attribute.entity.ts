import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * A character attribute defined at the campaign/table level (Força, Fé,
 * Corrupção…). Every character in the campaign — player, NPC, enemy, monster or
 * AI-generated — will later hold a value for each of these, bounded by
 * [minValue, maxValue]. There is NO fixed/hardcoded attribute list: the master
 * defines them freely per campaign.
 */
@Entity({ name: 'campaign_attributes' })
@Index('IDX_campaign_attributes_campaign', ['campaignId'])
export class CampaignAttribute extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ name: 'min_value', type: 'int' })
  minValue!: number;

  @Column({ name: 'max_value', type: 'int' })
  maxValue!: number;

  /** Ascending display position; ties broken by createdAt. */
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;
}
