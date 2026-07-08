/** A character attribute configured at the campaign/table level. */
export interface CampaignAttribute {
  id: string;
  campaignId: string;
  name: string;
  minValue: number;
  maxValue: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignAttributeInput {
  name: string;
  minValue: number;
  maxValue: number;
  displayOrder?: number;
}

/** Every field optional — only the provided ones are updated. */
export interface UpdateCampaignAttributeInput {
  name?: string;
  minValue?: number;
  maxValue?: number;
  displayOrder?: number;
}
