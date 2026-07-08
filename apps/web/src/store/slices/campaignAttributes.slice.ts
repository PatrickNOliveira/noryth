import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { campaignAttributeService } from '../../services/campaignAttribute.service';
import {
  CampaignAttribute,
  CreateCampaignAttributeInput,
  UpdateCampaignAttributeInput,
} from '../../types/campaignAttribute';
import { ApiError } from '../../services/api';

export interface CampaignAttributesState {
  list: CampaignAttribute[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: CampaignAttributesState = {
  list: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchAttributes = createAsyncThunk(
  'campaignAttributes/fetchList',
  (campaignId: string) => campaignAttributeService.list(campaignId),
);

export const createAttribute = createAsyncThunk(
  'campaignAttributes/create',
  (args: { campaignId: string; input: CreateCampaignAttributeInput }) =>
    campaignAttributeService.create(args.campaignId, args.input),
);

export const updateAttribute = createAsyncThunk(
  'campaignAttributes/update',
  (args: {
    campaignId: string;
    attributeId: string;
    input: UpdateCampaignAttributeInput;
  }) =>
    campaignAttributeService.update(
      args.campaignId,
      args.attributeId,
      args.input,
    ),
);

export const removeAttribute = createAsyncThunk(
  'campaignAttributes/remove',
  async (args: { campaignId: string; attributeId: string }) => {
    await campaignAttributeService.remove(args.campaignId, args.attributeId);
    return args.attributeId;
  },
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

/** Keeps the list ordered by displayOrder, then createdAt — mirrors the API. */
const sortAttributes = (list: CampaignAttribute[]) =>
  [...list].sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      a.createdAt.localeCompare(b.createdAt),
  );

const campaignAttributesSlice = createSlice({
  name: 'campaignAttributes',
  initialState,
  reducers: {
    clearAttributes(state) {
      state.list = [];
      state.error = null;
    },
    clearAttributesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttributes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAttributes.fulfilled,
        (state, action: PayloadAction<CampaignAttribute[]>) => {
          state.loading = false;
          state.list = sortAttributes(action.payload);
        },
      )
      .addCase(fetchAttributes.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(
        createAttribute.fulfilled,
        (state, action: PayloadAction<CampaignAttribute>) => {
          state.saving = false;
          state.list = sortAttributes([...state.list, action.payload]);
        },
      )
      .addCase(
        updateAttribute.fulfilled,
        (state, action: PayloadAction<CampaignAttribute>) => {
          state.saving = false;
          state.list = sortAttributes(
            state.list.map((a) =>
              a.id === action.payload.id ? action.payload : a,
            ),
          );
        },
      )
      .addCase(
        removeAttribute.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.saving = false;
          state.list = state.list.filter((a) => a.id !== action.payload);
        },
      );

    // Shared saving/error handling for the three mutations.
    for (const thunk of [createAttribute, updateAttribute, removeAttribute]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.error = message(action.error, 'failed');
        });
    }
  },
});

export const { clearAttributes, clearAttributesError } =
  campaignAttributesSlice.actions;
export default campaignAttributesSlice.reducer;
