import { api } from './api';
import {
  Character,
  CharacterAttributeValue,
  CreateCharacterInput,
  UpdateCharacterInput,
  CreatePlayerCharacterInput,
  UpdatePlayerCharacterInput,
} from '../types/character';

const pcBase = (campaignId: string) =>
  `/campaigns/${campaignId}/player-characters`;

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

  /** Master sets/clears a character's attribute-point budget. */
  async setAttributeBudget(
    campaignId: string,
    characterId: string,
    attributePointsBudget: number | null,
  ): Promise<Character> {
    const { data } = await api.patch<Character>(
      `/campaigns/${campaignId}/characters/${characterId}/attribute-budget`,
      { attributePointsBudget },
    );
    return data;
  },

  // ── player characters ──
  async getMine(campaignId: string): Promise<Character | null> {
    const { data } = await api.get<Character | null>(`${pcBase(campaignId)}/mine`);
    return data ?? null;
  },
  async createMine(
    campaignId: string,
    input: CreatePlayerCharacterInput,
  ): Promise<Character> {
    const { data } = await api.post<Character>(pcBase(campaignId), input);
    return data;
  },
  async updateMine(
    campaignId: string,
    characterId: string,
    input: UpdatePlayerCharacterInput,
  ): Promise<Character> {
    const { data } = await api.patch<Character>(
      `${pcBase(campaignId)}/${characterId}`,
      input,
    );
    return data;
  },
  async distribute(
    campaignId: string,
    characterId: string,
    attributes: CharacterAttributeValue[],
  ): Promise<Character> {
    const { data } = await api.put<Character>(
      `${pcBase(campaignId)}/${characterId}/attributes`,
      { attributes },
    );
    return data;
  },
  async regenerateMineImage(
    campaignId: string,
    characterId: string,
    options: { adjustments?: string; ignoreCampaignArtDirection?: boolean },
  ): Promise<Character> {
    const { data } = await api.post<Character>(
      `${pcBase(campaignId)}/${characterId}/regenerate-image`,
      options,
    );
    return data;
  },
  async getDefaultBudget(campaignId: string): Promise<number | null> {
    const { data } = await api.get<{
      defaultPlayerCharacterAttributePoints: number | null;
    }>(`${pcBase(campaignId)}/default-attribute-budget`);
    return data.defaultPlayerCharacterAttributePoints;
  },
};
