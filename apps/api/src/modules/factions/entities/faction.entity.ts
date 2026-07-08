import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { FactionStatus, FactionSymbolType } from '../faction.constants';

/**
 * Faction aggregate — a lore entity within a campaign. Rich narrative fields
 * feed the FactionSymbolAgent to build the AI image prompt. `approvedImage*`
 * hold the currently shown symbol (pending or approved).
 */
@Entity({ name: 'factions' })
export class Faction extends BaseEntity {
  @Index('IDX_factions_campaign')
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** Slug, or free text when "custom". */
  @Column({ type: 'varchar', length: 60 })
  type!: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  description!: string;

  @Column({ type: 'text', default: '' })
  history!: string;

  @Column({ type: 'text', default: '' })
  identity!: string;

  @Column({ name: 'member_traits', type: 'text', default: '' })
  memberTraits!: string;

  @Column({ type: 'text', default: '' })
  values!: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  motto!: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  colors!: string;

  @Column({ name: 'recurring_elements', type: 'text', default: '' })
  recurringElements!: string;

  @Column({ name: 'symbol_type', type: 'varchar', length: 20 })
  symbolType!: FactionSymbolType;

  @Column({ name: 'symbol_prompt', type: 'text', default: '' })
  symbolPrompt!: string;

  @Column({ name: 'approved_image_path', type: 'varchar', length: 512, nullable: true })
  approvedImagePath!: string | null;

  @Column({ name: 'approved_image_url', type: 'varchar', length: 1024, nullable: true })
  approvedImageUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: FactionStatus;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
