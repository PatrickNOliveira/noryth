import { api } from './api';
import {
  CampaignSession,
  SessionCharacter,
  AddSessionCharacterInput,
  UpdateSessionCharacterInput,
  ChangeMapResult,
  EndSessionResult,
  SpriteView,
  SpriteDirection,
} from '../types/session';
import {
  Character,
  CompleteImprovisedCharacterInput,
  CreateCharacterInput,
  ImprovisedCharacterDraft,
} from '../types/character';
import {
  CompleteImprovisedItemInput,
  CreateSessionItemInput,
  ImprovisedItemDraft,
  SessionItemResult,
} from '../types/item';
import {
  CompleteImprovisedAbilityInput,
  CreateSessionAbilityInput,
  ImprovisedAbilityDraft,
  SessionAbilityResult,
} from '../types/ability';
import { DiceRoll, RollDiceInput } from '../types/dice';

const base = (campaignId: string) => `/campaigns/${campaignId}/session`;

/** Campaign session API calls (start / read active), scoped to a campaign. */
export const sessionService = {
  /** Master only. Starts, or resumes, the active session with an initial map. */
  async start(
    campaignId: string,
    initialMapId: string,
  ): Promise<CampaignSession> {
    const { data } = await api.post<CampaignSession>(`${base(campaignId)}/start`, {
      initialMapId,
    });
    return data;
  },

  /** The active session for the campaign, or null if none is in progress. */
  async getActive(campaignId: string): Promise<CampaignSession | null> {
    const { data } = await api.get<CampaignSession | null>(
      `${base(campaignId)}/active`,
    );
    return data ?? null;
  },

  /** Master only. Switches the active session's map (clears placed characters). */
  async changeMap(campaignId: string, mapId: string): Promise<ChangeMapResult> {
    const { data } = await api.patch<ChangeMapResult>(
      `${base(campaignId)}/change-map`,
      { mapId },
    );
    return data;
  },

  /** Master only. Ends the active session. */
  async end(campaignId: string): Promise<EndSessionResult> {
    const { data } = await api.post<EndSessionResult>(`${base(campaignId)}/end`, {});
    return data;
  },

  // ── characters placed on the session map ──
  async listCharacters(campaignId: string): Promise<SessionCharacter[]> {
    const { data } = await api.get<SessionCharacter[]>(
      `${base(campaignId)}/characters`,
    );
    return data;
  },

  async addCharacter(
    campaignId: string,
    input: AddSessionCharacterInput,
  ): Promise<SessionCharacter> {
    const { data } = await api.post<SessionCharacter>(
      `${base(campaignId)}/characters`,
      input,
    );
    return data;
  },

  async updateCharacter(
    campaignId: string,
    id: string,
    input: UpdateSessionCharacterInput,
    signal?: AbortSignal,
  ): Promise<SessionCharacter> {
    const { data } = await api.patch<SessionCharacter>(
      `${base(campaignId)}/characters/${id}`,
      input,
      { signal },
    );
    return data;
  },

  async removeCharacter(campaignId: string, id: string): Promise<void> {
    await api.delete(`${base(campaignId)}/characters/${id}`);
  },

  /** Master: change the active form of a placed character (updates sprites). */
  async changeCharacterForm(
    campaignId: string,
    id: string,
    formId: string,
    clientMutationId?: string,
    signal?: AbortSignal,
  ): Promise<SessionCharacter> {
    const { data } = await api.patch<SessionCharacter>(
      `${base(campaignId)}/characters/${id}/form`,
      { formId, clientMutationId },
      { signal },
    );
    return data;
  },

  // ── improvise a character during the session (master only) ──

  /**
   * AI-completes the master's partial character, returning a draft to review
   * (nothing is persisted yet). The backend guarantees master-filled fields are
   * preserved verbatim.
   */
  async aiCompleteImprovisedCharacter(
    campaignId: string,
    input: CompleteImprovisedCharacterInput,
    signal?: AbortSignal,
  ): Promise<ImprovisedCharacterDraft> {
    const { data } = await api.post<ImprovisedCharacterDraft>(
      `${base(campaignId)}/characters/ai-complete`,
      input,
      { signal },
    );
    return data;
  },

  /** Creates the improvised character as a normal campaign character. */
  async createImprovisedCharacter(
    campaignId: string,
    input: CreateCharacterInput,
  ): Promise<Character> {
    const { data } = await api.post<Character>(
      `${base(campaignId)}/characters/create`,
      input,
    );
    return data;
  },

  // ── improvise an item during the session (master only) ──

  /** AI-completes the master's partial item, returning a draft to review. */
  async aiCompleteImprovisedItem(
    campaignId: string,
    input: CompleteImprovisedItemInput,
    signal?: AbortSignal,
  ): Promise<ImprovisedItemDraft> {
    const { data } = await api.post<ImprovisedItemDraft>(
      `${base(campaignId)}/items/ai-complete`,
      input,
      { signal },
    );
    return data;
  },

  /** Creates the improvised item (definition + optional first instance). */
  async createImprovisedItem(
    campaignId: string,
    input: CreateSessionItemInput,
  ): Promise<SessionItemResult> {
    const { data } = await api.post<SessionItemResult>(
      `${base(campaignId)}/items/create`,
      input,
    );
    return data;
  },

  // ── improvise an ability during the session (master only) ──

  /** AI-completes the master's partial ability, returning a draft to review. */
  async aiCompleteImprovisedAbility(
    campaignId: string,
    input: CompleteImprovisedAbilityInput,
    signal?: AbortSignal,
  ): Promise<ImprovisedAbilityDraft> {
    const { data } = await api.post<ImprovisedAbilityDraft>(
      `${base(campaignId)}/abilities/ai-complete`,
      input,
      { signal },
    );
    return data;
  },

  /** Creates the improvised ability (definition + optional character/form link). */
  async createImprovisedAbility(
    campaignId: string,
    input: CreateSessionAbilityInput,
  ): Promise<SessionAbilityResult> {
    const { data } = await api.post<SessionAbilityResult>(
      `${base(campaignId)}/abilities/create`,
      input,
    );
    return data;
  },

  /**
   * Master only. Rolls dice on the backend (source of truth). PUBLIC rolls are
   * also broadcast to everyone; SECRET rolls come back only in this response.
   */
  async rollDice(campaignId: string, input: RollDiceInput): Promise<DiceRoll> {
    const { data } = await api.post<DiceRoll>(
      `${base(campaignId)}/dice-rolls`,
      input,
    );
    return data;
  },

  /** Master or controller: (re)generate a character's session sprites. */
  async generateSprites(
    campaignId: string,
    characterId: string,
    directions?: SpriteDirection[],
  ): Promise<SpriteView[]> {
    const { data } = await api.post<SpriteView[]>(
      `/campaigns/${campaignId}/characters/${characterId}/session-sprites/generate`,
      { directions },
    );
    return data;
  },
};
