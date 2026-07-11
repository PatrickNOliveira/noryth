import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { SessionStatus } from '../session.constants';

/**
 * A live session of a campaign. A campaign has at most one ACTIVE session at a
 * time (enforced by the service). `currentMapId` is the map shown on the session
 * screen right now — it starts equal to `initialMapId` and session visibility is
 * driven by the session, not by the map's own `isVisibleToPlayers` flag.
 */
@Entity({ name: 'campaign_sessions' })
@Index('IDX_campaign_sessions_campaign', ['campaignId'])
export class CampaignSession extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'started_by_user_id', type: 'uuid' })
  startedByUserId!: string;

  @Column({ name: 'initial_map_id', type: 'uuid' })
  initialMapId!: string;

  @Column({ name: 'current_map_id', type: 'uuid' })
  currentMapId!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: SessionStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
