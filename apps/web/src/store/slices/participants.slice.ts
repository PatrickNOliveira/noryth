import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { participantService } from '../../services/participant.service';
import { Participant } from '../../types/participant';
import { ApiError } from '../../services/api';

export interface ParticipantsState {
  list: Participant[];
  /** User ids currently online — source of truth for the presence dot. */
  onlineUserIds: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ParticipantsState = {
  list: [],
  onlineUserIds: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchParticipants = createAsyncThunk(
  'participants/fetchList',
  (campaignId: string) => participantService.list(campaignId),
);

export const joinCampaign = createAsyncThunk(
  'participants/join',
  (args: { campaignId: string; password?: string }) =>
    participantService.join(args.campaignId, args.password),
);

export const setCampaignMaster = createAsyncThunk(
  'participants/setMaster',
  (args: { campaignId: string; userId: string }) =>
    participantService.setMaster(args.campaignId, args.userId),
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const addOnline = (ids: string[], userId: string) =>
  ids.includes(userId) ? ids : [...ids, userId];

const participantsSlice = createSlice({
  name: 'participants',
  initialState,
  reducers: {
    clearParticipants(state) {
      state.list = [];
      state.onlineUserIds = [];
      state.error = null;
    },
    /** Realtime: full snapshot of who is online (sent on join). */
    presenceSnapshot(state, action: PayloadAction<string[]>) {
      state.onlineUserIds = action.payload;
    },
    presenceOnline(state, action: PayloadAction<string>) {
      state.onlineUserIds = addOnline(state.onlineUserIds, action.payload);
    },
    presenceOffline(state, action: PayloadAction<string>) {
      state.onlineUserIds = state.onlineUserIds.filter(
        (id) => id !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParticipants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchParticipants.fulfilled,
        (state, action: PayloadAction<Participant[]>) => {
          state.loading = false;
          state.list = action.payload;
          // Seed presence from the server view; realtime events refine it.
          state.onlineUserIds = action.payload
            .filter((p) => p.online)
            .map((p) => p.userId);
        },
      )
      .addCase(fetchParticipants.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(
        setCampaignMaster.fulfilled,
        (state, action: PayloadAction<Participant[]>) => {
          state.saving = false;
          state.list = action.payload;
        },
      );

    for (const thunk of [joinCampaign, setCampaignMaster]) {
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

export const {
  clearParticipants,
  presenceSnapshot,
  presenceOnline,
  presenceOffline,
} = participantsSlice.actions;
export default participantsSlice.reducer;
