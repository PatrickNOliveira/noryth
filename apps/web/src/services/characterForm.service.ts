import { api } from './api';
import {
  CharacterForm,
  CreateCharacterFormInput,
  UpdateCharacterFormInput,
  FormAttributeValue,
} from '../types/characterForm';

const base = (campaignId: string, characterId: string) =>
  `/campaigns/${campaignId}/characters/${characterId}/forms`;

/** Alternative character forms API (campaign preparation). Master-only. */
export const characterFormService = {
  async list(campaignId: string, characterId: string): Promise<CharacterForm[]> {
    const { data } = await api.get<CharacterForm[]>(base(campaignId, characterId));
    return data;
  },
  async create(
    campaignId: string,
    characterId: string,
    input: CreateCharacterFormInput,
  ): Promise<CharacterForm> {
    const { data } = await api.post<CharacterForm>(base(campaignId, characterId), input);
    return data;
  },
  async update(
    campaignId: string,
    characterId: string,
    formId: string,
    input: UpdateCharacterFormInput,
  ): Promise<CharacterForm> {
    const { data } = await api.patch<CharacterForm>(
      `${base(campaignId, characterId)}/${formId}`,
      input,
    );
    return data;
  },
  async remove(campaignId: string, characterId: string, formId: string): Promise<void> {
    await api.delete(`${base(campaignId, characterId)}/${formId}`);
  },
  async setDefault(
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<CharacterForm> {
    const { data } = await api.post<CharacterForm>(
      `${base(campaignId, characterId)}/${formId}/set-default`,
    );
    return data;
  },
  async activate(
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<CharacterForm> {
    const { data } = await api.post<CharacterForm>(
      `${base(campaignId, characterId)}/${formId}/activate`,
    );
    return data;
  },
  async updateAttributes(
    campaignId: string,
    characterId: string,
    formId: string,
    attributes: FormAttributeValue[],
  ): Promise<CharacterForm> {
    const { data } = await api.put<CharacterForm>(
      `${base(campaignId, characterId)}/${formId}/attributes`,
      { attributes },
    );
    return data;
  },
  async updateAbilities(
    campaignId: string,
    characterId: string,
    formId: string,
    usesBaseAbilities: boolean,
    abilityDefinitionIds: string[],
  ): Promise<CharacterForm> {
    const { data } = await api.put<CharacterForm>(
      `${base(campaignId, characterId)}/${formId}/abilities`,
      { usesBaseAbilities, abilityDefinitionIds },
    );
    return data;
  },
  async generateImage(
    campaignId: string,
    characterId: string,
    formId: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean } = {},
  ): Promise<CharacterForm> {
    const { data } = await api.post<CharacterForm>(
      `${base(campaignId, characterId)}/${formId}/generate-image`,
      options,
    );
    return data;
  },
};
