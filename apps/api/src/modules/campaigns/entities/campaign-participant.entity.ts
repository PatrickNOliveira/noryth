import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * Membership of a user in a campaign. This table is the source of truth for
 * WHO belongs to a campaign (owner, master and players alike each get exactly
 * one row). It intentionally has NO `role` column: the owner and master are
 * single, authoritative concepts stored on the campaign (`ownerId`/`masterId`),
 * so a participant's role is DERIVED from those — avoiding two sources of truth.
 * See {@link participantRole}.
 */
@Entity({ name: 'campaign_participants' })
@Index('IDX_campaign_participants_campaign', ['campaignId'])
@Index('UQ_campaign_participants_campaign_user', ['campaignId', 'userId'], {
  unique: true,
})
export class CampaignParticipant extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'now()' })
  joinedAt!: Date;
}
