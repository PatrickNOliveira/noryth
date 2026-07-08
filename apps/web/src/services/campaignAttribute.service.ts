import { api } from './api';
import {
  CampaignAttribute,
  CreateCampaignAttributeInput,
  UpdateCampaignAttributeInput,
} from '../types/campaignAttribute';

/** Campaign attribute API calls, all scoped to a campaign/table. */
export const campaignAttributeService = {
  async list(campaignId: string): Promise<CampaignAttribute[]> {
    const { data } = await api.get<CampaignAttribute[]>(
      `/campaigns/${campaignId}/attributes`,
    );
    return data;
  },

  async create(
    campaignId: string,
    input: CreateCampaignAttributeInput,
  ): Promise<CampaignAttribute> {
    const { data } = await api.post<CampaignAttribute>(
      `/campaigns/${campaignId}/attributes`,
      input,
    );
    return data;
  },

  async update(
    campaignId: string,
    attributeId: string,
    input: UpdateCampaignAttributeInput,
  ): Promise<CampaignAttribute> {
    const { data } = await api.patch<CampaignAttribute>(
      `/campaigns/${campaignId}/attributes/${attributeId}`,
      input,
    );
    return data;
  },

  async remove(campaignId: string, attributeId: string): Promise<void> {
    await api.delete(`/campaigns/${campaignId}/attributes/${attributeId}`);
  },
};
