import { CampaignAttribute } from '../entities/campaign-attribute.entity';

/**
 * Persistence PORT for campaign attributes. The service depends on this
 * interface; the TypeORM adapter implements it. Domain logic stays ORM-free.
 */
export interface CampaignAttributesRepository {
  createEntity(data: Partial<CampaignAttribute>): CampaignAttribute;
  save(attribute: CampaignAttribute): Promise<CampaignAttribute>;
  remove(attribute: CampaignAttribute): Promise<void>;
  findById(id: string): Promise<CampaignAttribute | null>;
  /** Ordered by displayOrder ASC, then createdAt ASC. */
  findByCampaign(campaignId: string): Promise<CampaignAttribute[]>;
  /** Case-insensitive lookup used to enforce per-campaign name uniqueness. */
  findByNameInCampaign(
    campaignId: string,
    name: string,
  ): Promise<CampaignAttribute | null>;
  /** Highest displayOrder in the campaign, or null when there are none yet. */
  maxDisplayOrder(campaignId: string): Promise<number | null>;
  /**
   * Whether any character already holds a value for this attribute. Prepared
   * for the future character/attribute-values feature — returns false today.
   */
  isReferencedByCharacters(attributeId: string): Promise<boolean>;
}

/** DI token used to inject a {@link CampaignAttributesRepository}. */
export const CAMPAIGN_ATTRIBUTES_REPOSITORY = Symbol(
  'CAMPAIGN_ATTRIBUTES_REPOSITORY',
);
