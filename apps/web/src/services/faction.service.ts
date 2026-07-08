import { api } from './api';
import { Faction, CreateFactionInput } from '../types/faction';

/** Faction API calls, all scoped to a campaign. */
export const factionService = {
  async list(campaignId: string): Promise<Faction[]> {
    const { data } = await api.get<Faction[]>(`/campaigns/${campaignId}/factions`);
    return data;
  },

  async getById(campaignId: string, factionId: string): Promise<Faction> {
    const { data } = await api.get<Faction>(
      `/campaigns/${campaignId}/factions/${factionId}`,
    );
    return data;
  },

  async create(campaignId: string, input: CreateFactionInput): Promise<Faction> {
    const { data } = await api.post<Faction>(
      `/campaigns/${campaignId}/factions`,
      input,
    );
    return data;
  },

  async regenerate(
    campaignId: string,
    factionId: string,
    notes?: string,
  ): Promise<Faction> {
    const { data } = await api.post<Faction>(
      `/campaigns/${campaignId}/factions/${factionId}/regenerate`,
      { notes },
    );
    return data;
  },

  async approve(campaignId: string, factionId: string): Promise<Faction> {
    const { data } = await api.post<Faction>(
      `/campaigns/${campaignId}/factions/${factionId}/approve`,
      {},
    );
    return data;
  },

  async reject(campaignId: string, factionId: string): Promise<Faction> {
    const { data } = await api.post<Faction>(
      `/campaigns/${campaignId}/factions/${factionId}/reject`,
      {},
    );
    return data;
  },
};
