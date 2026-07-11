import { api } from './api';
import {
  AbilityDefinition,
  CharacterAbility,
  CreateAbilityInput,
  UpdateAbilityInput,
  ProposeAbilityInput,
  UpdateProposalInput,
  AssignAbilityInput,
} from '../types/ability';

const base = (campaignId: string) => `/campaigns/${campaignId}/abilities`;
const pc = (campaignId: string, characterId: string) =>
  `/campaigns/${campaignId}/player-characters/${characterId}/ability-proposals`;
const charAbilities = (campaignId: string, characterId: string) =>
  `/campaigns/${campaignId}/characters/${characterId}/abilities`;

/** Ability + approval-workflow API calls, scoped to a campaign. */
export const abilityService = {
  async list(campaignId: string): Promise<AbilityDefinition[]> {
    const { data } = await api.get<AbilityDefinition[]>(base(campaignId));
    return data;
  },
  async listPending(campaignId: string): Promise<AbilityDefinition[]> {
    const { data } = await api.get<AbilityDefinition[]>(`${base(campaignId)}/pending`);
    return data;
  },
  async getById(campaignId: string, id: string): Promise<AbilityDefinition> {
    const { data } = await api.get<AbilityDefinition>(`${base(campaignId)}/${id}`);
    return data;
  },
  async create(campaignId: string, input: CreateAbilityInput): Promise<AbilityDefinition> {
    const { data } = await api.post<AbilityDefinition>(base(campaignId), input);
    return data;
  },
  async update(campaignId: string, id: string, input: UpdateAbilityInput): Promise<AbilityDefinition> {
    const { data } = await api.patch<AbilityDefinition>(`${base(campaignId)}/${id}`, input);
    return data;
  },
  async remove(campaignId: string, id: string): Promise<void> {
    await api.delete(`${base(campaignId)}/${id}`);
  },
  async approve(campaignId: string, id: string, reviewNotes?: string): Promise<AbilityDefinition> {
    const { data } = await api.post<AbilityDefinition>(`${base(campaignId)}/${id}/approve`, { reviewNotes });
    return data;
  },
  async reject(campaignId: string, id: string, reviewNotes?: string): Promise<AbilityDefinition> {
    const { data } = await api.post<AbilityDefinition>(`${base(campaignId)}/${id}/reject`, { reviewNotes });
    return data;
  },
  async requestChanges(campaignId: string, id: string, reviewNotes?: string): Promise<AbilityDefinition> {
    const { data } = await api.post<AbilityDefinition>(`${base(campaignId)}/${id}/request-changes`, { reviewNotes });
    return data;
  },

  // player proposals
  async propose(campaignId: string, characterId: string, input: ProposeAbilityInput): Promise<AbilityDefinition> {
    const { data } = await api.post<AbilityDefinition>(pc(campaignId, characterId), input);
    return data;
  },
  async updateProposal(campaignId: string, characterId: string, id: string, input: UpdateProposalInput): Promise<AbilityDefinition> {
    const { data } = await api.patch<AbilityDefinition>(`${pc(campaignId, characterId)}/${id}`, input);
    return data;
  },

  // character abilities
  async listCharacterAbilities(campaignId: string, characterId: string): Promise<CharacterAbility[]> {
    const { data } = await api.get<CharacterAbility[]>(charAbilities(campaignId, characterId));
    return data;
  },
  async assign(campaignId: string, characterId: string, input: AssignAbilityInput): Promise<CharacterAbility> {
    const { data } = await api.post<CharacterAbility>(charAbilities(campaignId, characterId), input);
    return data;
  },
  async removeFromCharacter(campaignId: string, characterId: string, linkId: string): Promise<void> {
    await api.delete(`${charAbilities(campaignId, characterId)}/${linkId}`);
  },
};
