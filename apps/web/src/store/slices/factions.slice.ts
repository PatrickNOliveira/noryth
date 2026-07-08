import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { factionService } from '../../services/faction.service';
import { Faction, CreateFactionInput } from '../../types/faction';
import { ApiError } from '../../services/api';

export interface FactionsState {
  list: Faction[];
  selected: Faction | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: FactionsState = {
  list: [],
  selected: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchFactions = createAsyncThunk(
  'factions/fetchList',
  (campaignId: string) => factionService.list(campaignId),
);

export const fetchFaction = createAsyncThunk(
  'factions/fetchOne',
  (args: { campaignId: string; factionId: string }) =>
    factionService.getById(args.campaignId, args.factionId),
);

export const createFaction = createAsyncThunk(
  'factions/create',
  (args: { campaignId: string; input: CreateFactionInput }) =>
    factionService.create(args.campaignId, args.input),
);

export const regenerateFaction = createAsyncThunk(
  'factions/regenerate',
  (args: { campaignId: string; factionId: string; notes?: string }) =>
    factionService.regenerate(args.campaignId, args.factionId, args.notes),
);

export const approveFaction = createAsyncThunk(
  'factions/approve',
  (args: { campaignId: string; factionId: string }) =>
    factionService.approve(args.campaignId, args.factionId),
);

export const rejectFaction = createAsyncThunk(
  'factions/reject',
  (args: { campaignId: string; factionId: string }) =>
    factionService.reject(args.campaignId, args.factionId),
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const factionsSlice = createSlice({
  name: 'factions',
  initialState,
  reducers: {
    clearSelectedFaction(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFactions.fulfilled, (state, action: PayloadAction<Faction[]>) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchFactions.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(fetchFaction.pending, (state) => {
        // Keep `selected` so background polling doesn't flicker the page; only
        // show the full loader on the initial fetch.
        if (!state.selected) state.loading = true;
        state.error = null;
      })
      .addCase(fetchFaction.fulfilled, (state, action: PayloadAction<Faction>) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchFaction.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(createFaction.fulfilled, (state, action: PayloadAction<Faction>) => {
        state.list.unshift(action.payload);
        state.selected = action.payload;
      });

    // Mutations that return the updated faction with images.
    for (const thunk of [regenerateFaction, approveFaction, rejectFaction]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action: PayloadAction<Faction>) => {
          state.saving = false;
          state.selected = action.payload;
          state.list = state.list.map((f) =>
            f.id === action.payload.id ? action.payload : f,
          );
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          state.error = message(action.error, 'failed');
        });
    }
  },
});

export const { clearSelectedFaction } = factionsSlice.actions;
export default factionsSlice.reducer;
