import { api } from './api';
import {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '../types/character';

/** Character API calls, all scoped to a campaign. */
export const characterService = {
  async list(campaignId: string): Promise<Character[]> {
    const { data } = await api.get<Character[]>(
      `/campaigns/${campaignId}/characters`,
    );
    return data;
  },

  async getById(campaignId: string, characterId: string): Promise<Character> {
    const { data } = await api.get<Character>(
      `/campaigns/${campaignId}/characters/${characterId}`,
    );
    return data;
  },

  async create(
    campaignId: string,
    input: CreateCharacterInput,
  ): Promise<Character> {
    const { data } = await api.post<Character>(
      `/campaigns/${campaignId}/characters`,
      input,
    );
    return data;
  },

  async update(
    campaignId: string,
    characterId: string,
    input: UpdateCharacterInput,
  ): Promise<Character> {
    const { data } = await api.patch<Character>(
      `/campaigns/${campaignId}/characters/${characterId}`,
      input,
    );
    return data;
  },

  async remove(campaignId: string, characterId: string): Promise<void> {
    await api.delete(`/campaigns/${campaignId}/characters/${characterId}`);
  },

  async generateImage(
    campaignId: string,
    characterId: string,
  ): Promise<Character> {
    const { data } = await api.post<Character>(
      `/campaigns/${campaignId}/characters/${characterId}/generate-image`,
      {},
    );
    return data;
  },

  /** Regenerate / ask for changes on an existing portrait. */
  async regenerateImage(
    campaignId: string,
    characterId: string,
    options: { adjustments?: string; ignoreCampaignArtDirection?: boolean },
  ): Promise<Character> {
    const { data } = await api.post<Character>(
      `/campaigns/${campaignId}/characters/${characterId}/regenerate-image`,
      options,
    );
    return data;
  },

  async getArtDirection(campaignId: string): Promise<string> {
    const { data } = await api.get<{ characterArtDirection: string }>(
      `/campaigns/${campaignId}/characters/art-direction`,
    );
    return data.characterArtDirection;
  },

  async setArtDirection(
    campaignId: string,
    characterArtDirection: string,
  ): Promise<string> {
    const { data } = await api.put<{ characterArtDirection: string }>(
      `/campaigns/${campaignId}/characters/art-direction`,
      { characterArtDirection },
    );
    return data.characterArtDirection;
  },

  async clearArtDirection(campaignId: string): Promise<string> {
    const { data } = await api.delete<{ characterArtDirection: string }>(
      `/campaigns/${campaignId}/characters/art-direction`,
    );
    return data.characterArtDirection;
  },
};
