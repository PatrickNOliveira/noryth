import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { campaignService } from '../../services/campaign.service';
import { Campaign, CreateCampaignInput } from '../../types/campaign';
import { ApiError } from '../../services/api';

export interface CampaignsState {
  myCampaigns: Campaign[];
  selectedCampaign: Campaign | null;
  loading: boolean;
  error: string | null;
}

const initialState: CampaignsState = {
  myCampaigns: [],
  selectedCampaign: null,
  loading: false,
  error: null,
};

export const fetchMyCampaigns = createAsyncThunk('campaigns/fetchMine', () =>
  campaignService.listMine(),
);

export const fetchCampaign = createAsyncThunk('campaigns/fetchOne', (id: string) =>
  campaignService.getById(id),
);

export const createCampaign = createAsyncThunk(
  'campaigns/create',
  (input: CreateCampaignInput) => campaignService.create(input),
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    clearSelectedCampaign(state) {
      state.selectedCampaign = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyCampaigns.fulfilled, (state, action: PayloadAction<Campaign[]>) => {
        state.loading = false;
        state.myCampaigns = action.payload;
      })
      .addCase(fetchMyCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(fetchCampaign.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.selectedCampaign = null;
      })
      .addCase(fetchCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
        state.loading = false;
        state.selectedCampaign = action.payload;
      })
      .addCase(fetchCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(createCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
        state.myCampaigns.unshift(action.payload);
        state.selectedCampaign = action.payload;
      });
  },
});

export const { clearSelectedCampaign } = campaignsSlice.actions;
export default campaignsSlice.reducer;
