import { api } from './api';
import {
  ItemDefinition,
  ItemInstance,
  CreateItemDefinitionInput,
  UpdateItemDefinitionInput,
  CreateItemInstanceInput,
  UpdateItemInstanceInput,
} from '../types/item';

const defs = (campaignId: string) => `/campaigns/${campaignId}/items`;
const inst = (campaignId: string) => `/campaigns/${campaignId}/item-instances`;

/** Item definition + instance API calls, scoped to a campaign. */
export const itemService = {
  // ── definitions ──
  async list(campaignId: string): Promise<ItemDefinition[]> {
    const { data } = await api.get<ItemDefinition[]>(defs(campaignId));
    return data;
  },
  async getById(campaignId: string, id: string): Promise<ItemDefinition> {
    const { data } = await api.get<ItemDefinition>(`${defs(campaignId)}/${id}`);
    return data;
  },
  async create(
    campaignId: string,
    input: CreateItemDefinitionInput,
  ): Promise<ItemDefinition> {
    const { data } = await api.post<ItemDefinition>(defs(campaignId), input);
    return data;
  },
  async update(
    campaignId: string,
    id: string,
    input: UpdateItemDefinitionInput,
  ): Promise<ItemDefinition> {
    const { data } = await api.patch<ItemDefinition>(`${defs(campaignId)}/${id}`, input);
    return data;
  },
  async remove(campaignId: string, id: string): Promise<void> {
    await api.delete(`${defs(campaignId)}/${id}`);
  },
  async regenerateImage(
    campaignId: string,
    id: string,
    options: { adjustments?: string; ignoreCampaignArtDirection?: boolean },
  ): Promise<ItemDefinition> {
    const { data } = await api.post<ItemDefinition>(
      `${defs(campaignId)}/${id}/regenerate-image`,
      options,
    );
    return data;
  },
  async getArtDirection(campaignId: string): Promise<string> {
    const { data } = await api.get<{ itemArtDirection: string }>(
      `${defs(campaignId)}/art-direction`,
    );
    return data.itemArtDirection;
  },
  async setArtDirection(campaignId: string, value: string): Promise<string> {
    const { data } = await api.put<{ itemArtDirection: string }>(
      `${defs(campaignId)}/art-direction`,
      { itemArtDirection: value },
    );
    return data.itemArtDirection;
  },
  async clearArtDirection(campaignId: string): Promise<string> {
    const { data } = await api.delete<{ itemArtDirection: string }>(
      `${defs(campaignId)}/art-direction`,
    );
    return data.itemArtDirection;
  },

  // ── instances ──
  async listInstances(
    campaignId: string,
    itemDefinitionId?: string,
  ): Promise<ItemInstance[]> {
    const { data } = await api.get<ItemInstance[]>(inst(campaignId), {
      params: itemDefinitionId ? { itemDefinitionId } : undefined,
    });
    return data;
  },

  /** Item instances held by a character (their session inventory). */
  async listInstancesByHolder(
    campaignId: string,
    holderCharacterId: string,
  ): Promise<ItemInstance[]> {
    const { data } = await api.get<ItemInstance[]>(inst(campaignId), {
      params: { holderCharacterId },
    });
    return data;
  },
  async createInstance(
    campaignId: string,
    input: CreateItemInstanceInput,
  ): Promise<ItemInstance> {
    const { data } = await api.post<ItemInstance>(inst(campaignId), input);
    return data;
  },
  async updateInstance(
    campaignId: string,
    id: string,
    input: UpdateItemInstanceInput,
  ): Promise<ItemInstance> {
    const { data } = await api.patch<ItemInstance>(`${inst(campaignId)}/${id}`, input);
    return data;
  },
  async removeInstance(campaignId: string, id: string): Promise<void> {
    await api.delete(`${inst(campaignId)}/${id}`);
  },
};
