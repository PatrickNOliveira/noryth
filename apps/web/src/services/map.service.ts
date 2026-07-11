import { api } from './api';
import {
  CampaignMap,
  CreateMapInput,
  UpdateMapInput,
  MapPoint,
  CreateMapPointInput,
  UpdateMapPointInput,
} from '../types/map';

const base = (campaignId: string) => `/campaigns/${campaignId}/maps`;

/** Map + point-of-interest API calls, all scoped to a campaign. */
export const mapService = {
  async list(campaignId: string): Promise<CampaignMap[]> {
    const { data } = await api.get<CampaignMap[]>(base(campaignId));
    return data;
  },

  async getById(campaignId: string, mapId: string): Promise<CampaignMap> {
    const { data } = await api.get<CampaignMap>(`${base(campaignId)}/${mapId}`);
    return data;
  },

  async create(campaignId: string, input: CreateMapInput): Promise<CampaignMap> {
    const { data } = await api.post<CampaignMap>(base(campaignId), input);
    return data;
  },

  async update(
    campaignId: string,
    mapId: string,
    input: UpdateMapInput,
  ): Promise<CampaignMap> {
    const { data } = await api.patch<CampaignMap>(
      `${base(campaignId)}/${mapId}`,
      input,
    );
    return data;
  },

  async remove(campaignId: string, mapId: string): Promise<void> {
    await api.delete(`${base(campaignId)}/${mapId}`);
  },

  /** (Re)generate the 2.5D session scene for a map. Master only. */
  async generateSessionScene(
    campaignId: string,
    mapId: string,
    adjustments?: string,
  ): Promise<CampaignMap> {
    const { data } = await api.post<CampaignMap>(
      `${base(campaignId)}/${mapId}/session-scene`,
      { adjustments },
    );
    return data;
  },

  async regenerateImage(
    campaignId: string,
    mapId: string,
    options: {
      adjustments?: string;
      ignoreCampaignArtDirection?: boolean;
      includeLabels?: boolean;
    },
  ): Promise<CampaignMap> {
    const { data } = await api.post<CampaignMap>(
      `${base(campaignId)}/${mapId}/regenerate-image`,
      options,
    );
    return data;
  },

  // ── art direction ──
  async getArtDirection(campaignId: string): Promise<string> {
    const { data } = await api.get<{ mapArtDirection: string }>(
      `${base(campaignId)}/art-direction`,
    );
    return data.mapArtDirection;
  },
  async setArtDirection(campaignId: string, value: string): Promise<string> {
    const { data } = await api.put<{ mapArtDirection: string }>(
      `${base(campaignId)}/art-direction`,
      { mapArtDirection: value },
    );
    return data.mapArtDirection;
  },
  async clearArtDirection(campaignId: string): Promise<string> {
    const { data } = await api.delete<{ mapArtDirection: string }>(
      `${base(campaignId)}/art-direction`,
    );
    return data.mapArtDirection;
  },

  // ── points of interest ──
  async listPoints(campaignId: string, mapId: string): Promise<MapPoint[]> {
    const { data } = await api.get<MapPoint[]>(
      `${base(campaignId)}/${mapId}/points`,
    );
    return data;
  },
  async createPoint(
    campaignId: string,
    mapId: string,
    input: CreateMapPointInput,
  ): Promise<MapPoint> {
    const { data } = await api.post<MapPoint>(
      `${base(campaignId)}/${mapId}/points`,
      input,
    );
    return data;
  },
  async updatePoint(
    campaignId: string,
    mapId: string,
    pointId: string,
    input: UpdateMapPointInput,
  ): Promise<MapPoint> {
    const { data } = await api.patch<MapPoint>(
      `${base(campaignId)}/${mapId}/points/${pointId}`,
      input,
    );
    return data;
  },
  async removePoint(
    campaignId: string,
    mapId: string,
    pointId: string,
  ): Promise<void> {
    await api.delete(`${base(campaignId)}/${mapId}/points/${pointId}`);
  },

  /** Master: move a point on the 2.5D session scene (percent coords). */
  async updatePointScenePosition(
    campaignId: string,
    mapId: string,
    pointId: string,
    body: { sceneX: number; sceneY: number; clientMutationId?: string },
    signal?: AbortSignal,
  ): Promise<MapPoint> {
    const { data } = await api.patch<MapPoint>(
      `${base(campaignId)}/${mapId}/points/${pointId}/scene-position`,
      body,
      { signal },
    );
    return data;
  },
};
