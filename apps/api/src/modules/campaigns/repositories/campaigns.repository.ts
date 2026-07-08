import { Campaign } from '../entities/campaign.entity';

/**
 * Persistence PORT for campaigns. The service depends on this interface; the
 * TypeORM adapter implements it. Domain logic stays free of the ORM.
 */
export interface CampaignsRepository {
  createEntity(data: Partial<Campaign>): Campaign;
  save(campaign: Campaign): Promise<Campaign>;
  findById(id: string): Promise<Campaign | null>;
  findByOwner(ownerId: string): Promise<Campaign[]>;
  /** Campaigns the user takes part in (owner, master or player) — no dups. */
  findByParticipant(userId: string): Promise<Campaign[]>;
  /** Public, non-archived campaigns for discovery. */
  findPublic(): Promise<Campaign[]>;
}

/** DI token used to inject a {@link CampaignsRepository}. */
export const CAMPAIGNS_REPOSITORY = Symbol('CAMPAIGNS_REPOSITORY');
