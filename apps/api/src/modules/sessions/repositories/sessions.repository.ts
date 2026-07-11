import { CampaignSession } from '../entities/campaign-session.entity';

/**
 * Persistence PORT for campaign sessions. The service depends on this interface;
 * the TypeORM adapter implements it. No infrastructure leaks into domain code.
 */
export interface SessionsRepository {
  create(data: Partial<CampaignSession>): CampaignSession;
  save(session: CampaignSession): Promise<CampaignSession>;
  findById(id: string): Promise<CampaignSession | null>;
  /** The single ACTIVE session of a campaign, if any. */
  findActiveByCampaign(campaignId: string): Promise<CampaignSession | null>;
}

/** DI token used to inject a {@link SessionsRepository}. */
export const SESSIONS_REPOSITORY = Symbol('SESSIONS_REPOSITORY');
