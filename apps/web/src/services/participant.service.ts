import { api } from './api';
import { Participant } from '../types/participant';

/** Campaign membership API calls, all scoped to a campaign. */
export const participantService = {
  async list(campaignId: string): Promise<Participant[]> {
    const { data } = await api.get<Participant[]>(
      `/campaigns/${campaignId}/participants`,
    );
    return data;
  },

  async join(campaignId: string, password?: string): Promise<Participant> {
    const { data } = await api.post<Participant>(
      `/campaigns/${campaignId}/join`,
      { password },
    );
    return data;
  },

  async setMaster(
    campaignId: string,
    userId: string,
  ): Promise<Participant[]> {
    const { data } = await api.patch<Participant[]>(
      `/campaigns/${campaignId}/master`,
      { userId },
    );
    return data;
  },
};
