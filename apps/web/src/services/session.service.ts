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
