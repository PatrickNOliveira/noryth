import { api } from './api';
import {
  ItemDefinition,
  ItemInstance,
  CreateItemDefinitionInput,
  UpdateItemDefinitionInput,
  CreateItemInstanceInput,
  UpdateItemInstanceInput,
  ItemDefinitionListItem,
  ItemSessionDetail,
  GiveItemToCharacterInput,
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

  // ── session item management (master only) ──

  /** Campaign items with instance counts + optional name search. */
  async sessionList(
    campaignId: string,
    search?: string,
    signal?: AbortSignal,
  ): Promise<ItemDefinitionListItem[]> {
    const { data } = await api.get<ItemDefinitionListItem[]>(
      `${defs(campaignId)}/session-list`,
      { params: search ? { search } : undefined, signal },
    );
    return data;
  },

  /** Item sheet with all its instances. */
  async sessionDetail(
    campaignId: string,
    id: string,
  ): Promise<ItemSessionDetail> {
    const { data } = await api.get<ItemSessionDetail>(
      `${defs(campaignId)}/${id}/session-detail`,
    );
    return data;
  },

  /** Give this item to a character (creates a new instance / transfers the unique one). */
  async giveToCharacter(
    campaignId: string,
    id: string,
    input: GiveItemToCharacterInput,
  ): Promise<ItemInstance> {
    const { data } = await api.post<ItemInstance>(
      `${defs(campaignId)}/${id}/give-to-character`,
      input,
    );
    return data;
  },

  /** Transfer a specific existing instance to a character. */
  async transferInstance(
    campaignId: string,
    instanceId: string,
    characterId: string,
  ): Promise<ItemInstance> {
    const { data } = await api.patch<ItemInstance>(
      `${inst(campaignId)}/${instanceId}/transfer`,
      { characterId },
    );
    return data;
  },

  /** Clear the holder of an instance (keeps the instance). */
  async unassignHolder(
    campaignId: string,
    instanceId: string,
    state?: string,
  ): Promise<ItemInstance> {
    const { data } = await api.patch<ItemInstance>(
      `${inst(campaignId)}/${instanceId}/unassign-holder`,
      state ? { state } : {},
    );
    return data;
  },
};
