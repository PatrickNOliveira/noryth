import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import {
  AbilityApprovalStatus,
  AbilityCreationSource,
} from '../ability.constants';

/**
 * The definition of an ability. Master-created ones are born APPROVED; player
 * proposals are born PENDING_APPROVAL and carry the proposer/target character
 * and the master's review notes.
 */
@Entity({ name: 'ability_definitions' })
@Index('IDX_ability_definitions_campaign', ['campaignId'])
export class AbilityDefinition extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  /** Where this ability was authored (campaign prep vs. improvised in session). */
  @Column({
    name: 'creation_source',
    type: 'varchar',
    length: 20,
    default: 'PREPARATION',
  })
  creationSource!: AbilityCreationSource;

  /** The session it was improvised in, when `creationSource === 'SESSION'`. */
  @Column({ name: 'created_during_session_id', type: 'uuid', nullable: true })
  createdDuringSessionId!: string | null;

  @Column({ name: 'proposed_by_user_id', type: 'uuid', nullable: true })
  proposedByUserId!: string | null;

  @Column({ name: 'proposed_for_character_id', type: 'uuid', nullable: true })
  proposedForCharacterId!: string | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'rejected_by_user_id', type: 'uuid', nullable: true })
  rejectedByUserId!: string | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({
    name: 'approval_status',
    type: 'varchar',
    length: 20,
    default: 'APPROVED',
  })
  approvalStatus!: AbilityApprovalStatus;

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

  @Column({ name: 'effect_description', type: 'text', default: '' })
  effectDescription!: string;

  @Column({ name: 'rules_text', type: 'text', default: '' })
  rulesText!: string;

  @Column({ name: 'cost_description', type: 'text', default: '' })
  costDescription!: string;

  @Column({ name: 'limitation_description', type: 'text', default: '' })
  limitationDescription!: string;

  @Column({ name: 'is_unique', type: 'boolean', default: false })
  isUnique!: boolean;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  @Column({ name: 'faction_id', type: 'uuid', nullable: true })
  factionId!: string | null;

  /** Master-only private notes; never shown to players. */
  @Column({ name: 'master_notes', type: 'text', default: '' })
  masterNotes!: string;

  /** Master's review notes on a proposal; shown to the proposer + master. */
  @Column({ name: 'review_notes', type: 'text', default: '' })
  reviewNotes!: string;
}
