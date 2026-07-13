import { api } from './api';
import {
  ResourceDefinition,
  CreateResourceInput,
  UpdateResourceInput,
  CharacterResource,
  CharacterResourceValueInput,
  FormResourceOverride,
  FormResourceOverrideValueInput,
  SessionResourceUpdate,
} from '../types/resource';

const base = (campaignId: string) => `/campaigns/${campaignId}/resources`;
const charBase = (campaignId: string, characterId: string) =>
  `/campaigns/${campaignId}/characters/${characterId}/resources`;
const formBase = (campaignId: string, characterId: string, formId: string) =>
  `/campaigns/${campaignId}/characters/${characterId}/forms/${formId}/resources`;

/** Campaign resource + character/form resource API calls, scoped to a campaign. */
export const resourceService = {
  // ── campaign resource definitions ──
  async list(campaignId: string): Promise<ResourceDefinition[]> {
    const { data } = await api.get<ResourceDefinition[]>(base(campaignId));
    return data;
  },
  async create(
    campaignId: string,
    input: CreateResourceInput,
  ): Promise<ResourceDefinition> {
    const { data } = await api.post<ResourceDefinition>(base(campaignId), input);
    return data;
  },
  async update(
    campaignId: string,
    resourceId: string,
    input: UpdateResourceInput,
  ): Promise<ResourceDefinition> {
    const { data } = await api.patch<ResourceDefinition>(
      `${base(campaignId)}/${resourceId}`,
      input,
    );
    return data;
  },
  async remove(campaignId: string, resourceId: string): Promise<void> {
    await api.delete(`${base(campaignId)}/${resourceId}`);
  },

  // ── character resources ──
  async listForCharacter(
    campaignId: string,
    characterId: string,
  ): Promise<CharacterResource[]> {
    const { data } = await api.get<CharacterResource[]>(
      charBase(campaignId, characterId),
    );
    return data;
  },
  async updateForCharacter(
    campaignId: string,
    characterId: string,
    resources: CharacterResourceValueInput[],
  ): Promise<CharacterResource[]> {
    const { data } = await api.put<CharacterResource[]>(
      charBase(campaignId, characterId),
      { resources },
    );
    return data;
  },

  // ── session resource adjustment (spend/add during a live session) ──
  async adjustSessionResource(
    campaignId: string,
    sessionCharacterId: string,
    resourceDefinitionId: string,
    delta: number,
    clientMutationId: string,
    signal?: AbortSignal,
  ): Promise<SessionResourceUpdate> {
    const { data } = await api.patch<SessionResourceUpdate>(
      `/campaigns/${campaignId}/session/characters/${sessionCharacterId}/resources/${resourceDefinitionId}/adjust`,
      { delta, clientMutationId },
      { signal },
    );
    return data;
  },

  // ── form resource overrides ──
  async listForForm(
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<FormResourceOverride[]> {
    const { data } = await api.get<FormResourceOverride[]>(
      formBase(campaignId, characterId, formId),
    );
    return data;
  },
  async updateForForm(
    campaignId: string,
    characterId: string,
    formId: string,
    resources: FormResourceOverrideValueInput[],
  ): Promise<FormResourceOverride[]> {
    const { data } = await api.put<FormResourceOverride[]>(
      formBase(campaignId, characterId, formId),
      { resources },
    );
    return data;
  },
};
