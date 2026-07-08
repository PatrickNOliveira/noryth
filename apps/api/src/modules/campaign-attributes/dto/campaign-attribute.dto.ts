import { CampaignAttribute } from '../entities/campaign-attribute.entity';

/** Public view of a campaign attribute. */
export interface CampaignAttributeDto {
  id: string;
  campaignId: string;
  name: string;
  minValue: number;
  maxValue: number;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toCampaignAttributeDto(
  attribute: CampaignAttribute,
): CampaignAttributeDto {
  return {
    id: attribute.id,
    campaignId: attribute.campaignId,
    name: attribute.name,
    minValue: attribute.minValue,
    maxValue: attribute.maxValue,
    displayOrder: attribute.displayOrder,
    createdAt: attribute.createdAt,
    updatedAt: attribute.updatedAt,
  };
}
