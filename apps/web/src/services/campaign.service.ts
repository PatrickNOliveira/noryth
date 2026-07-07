import { api } from './api';
import { Campaign, CreateCampaignInput } from '../types/campaign';

/** Appends a value only when it is meaningfully present. */
function appendIf(form: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  form.append(key, String(value));
}

/** Campaign API calls. Creation goes through multipart/form-data for the cover. */
export const campaignService = {
  async create(input: CreateCampaignInput): Promise<Campaign> {
    const form = new FormData();
    form.append('name', input.name);
    form.append('theme', input.theme);
    appendIf(form, 'customTheme', input.customTheme);
    form.append('shortDescription', input.shortDescription);
    form.append('premise', input.premise);
    form.append('tone', input.tone);
    appendIf(form, 'customTone', input.customTone);
    form.append('mainLanguage', input.mainLanguage);
    form.append('visibility', input.visibility);
    appendIf(form, 'password', input.password);
    appendIf(form, 'maxPlayers', input.maxPlayers);
    if (input.coverImage) {
      form.append('coverImage', input.coverImage);
    }

    const { data } = await api.post<Campaign>('/campaigns', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async listMine(): Promise<Campaign[]> {
    const { data } = await api.get<Campaign[]>('/campaigns/my');
    return data;
  },

  async getById(id: string): Promise<Campaign> {
    const { data } = await api.get<Campaign>(`/campaigns/${id}`);
    return data;
  },
};
