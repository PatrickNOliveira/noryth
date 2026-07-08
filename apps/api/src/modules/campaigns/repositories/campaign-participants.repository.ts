import { CampaignParticipant } from '../entities/campaign-participant.entity';

/**
 * Persistence PORT for campaign membership. The service depends on this
 * interface; the TypeORM adapter implements it.
 */
export interface CampaignParticipantsRepository {
  createEntity(data: Partial<CampaignParticipant>): CampaignParticipant;
  save(participant: CampaignParticipant): Promise<CampaignParticipant>;
  remove(participant: CampaignParticipant): Promise<void>;
  findByCampaign(campaignId: string): Promise<CampaignParticipant[]>;
  findOne(
    campaignId: string,
    userId: string,
  ): Promise<CampaignParticipant | null>;
  exists(campaignId: string, userId: string): Promise<boolean>;
  countByCampaign(campaignId: string): Promise<number>;
}

/** DI token used to inject a {@link CampaignParticipantsRepository}. */
export const CAMPAIGN_PARTICIPANTS_REPOSITORY = Symbol(
  'CAMPAIGN_PARTICIPANTS_REPOSITORY',
);
