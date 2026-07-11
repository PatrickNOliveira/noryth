import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { sessionService } from '../../services/session.service';
import { mapService } from '../../services/map.service';
import { CampaignSession } from '../../types/session';
import { CampaignMap, MapImageStatus } from '../../types/map';
import { ApiError } from '../../services/api';

/** A map's minimal shape needed for the optimistic switch (name/scene). */
type SwitchMap = CampaignMap;

export interface SessionState {
  active: CampaignSession | null;
  /** True once the active session has been fetched at least once for the campaign. */
  loaded: boolean;
  loading: boolean;
  starting: boolean;
  error: string | null;
}

const initialState: SessionState = {
  active: null,
  loaded: false,
  loading: false,
  starting: false,
  error: null,
};

export const fetchActiveSession = createAsyncThunk(
  'session/fetchActive',
  (campaignId: string) => sessionService.getActive(campaignId),
);

export const startSession = createAsyncThunk(
  'session/start',
  (args: { campaignId: string; initialMapId: string }) =>
    sessionService.start(args.campaignId, args.initialMapId),
);

export const generateSessionScene = createAsyncThunk(
  'session/generateScene',
  (args: { campaignId: string; mapId: string; adjustments?: string }) =>
    mapService.generateSessionScene(args.campaignId, args.mapId, args.adjustments),
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /** Reset when leaving a campaign so state never bleeds across campaigns. */
    clearSession(state) {
      state.active = null;
      state.loaded = false;
      state.error = null;
    },
    /** Replace the active session (e.g. after a confirmed map change). */
    setActiveSession(state, action: PayloadAction<CampaignSession>) {
      state.active = action.payload;
      state.loaded = true;
    },
    /** Optimistic map switch: point the session at the chosen map right away. */
    sessionMapSet(state, action: PayloadAction<SwitchMap>) {
      if (state.active) {
        state.active.map = action.payload;
        state.active.currentMapId = action.payload.id;
      }
    },
    /** Move a point of interest on the 2.5D scene (optimistic + realtime). */
    sessionPointMoved(
      state,
      action: PayloadAction<{ pointId: string; sceneX: number; sceneY: number }>,
    ) {
      const point = state.active?.map?.points?.find(
        (p) => p.id === action.payload.pointId,
      );
      if (point) {
        point.sceneX = action.payload.sceneX;
        point.sceneY = action.payload.sceneY;
      }
    },
    /** Realtime `campaign.session.started` — mark that a session is in progress. */
    sessionStarted(state, action: PayloadAction<{ sessionId: string }>) {
      if (state.active?.id !== action.payload.sessionId) {
        // The full session (with map) is fetched by the screen on entry.
        state.loaded = false;
      }
    },
    /** Realtime `map.session_scene.*` — patch the current map's scene state. */
    sessionSceneUpdate(
      state,
      action: PayloadAction<{
        mapId: string;
        status: MapImageStatus;
        sessionSceneImageUrl?: string | null;
        error?: string | null;
      }>,
    ) {
      const map = state.active?.map;
      if (!map || map.id !== action.payload.mapId) return;
      map.sessionSceneImageStatus = action.payload.status;
      if (action.payload.sessionSceneImageUrl !== undefined) {
        map.sessionSceneImageUrl = action.payload.sessionSceneImageUrl;
      }
      map.sessionSceneImageError = action.payload.error ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchActiveSession.fulfilled,
        (state, action: PayloadAction<CampaignSession | null>) => {
          state.loading = false;
          state.loaded = true;
          state.active = action.payload;
        },
      )
      .addCase(fetchActiveSession.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = message(action.error, 'failed');
      })
      .addCase(startSession.pending, (state) => {
        state.starting = true;
        state.error = null;
      })
      .addCase(
        startSession.fulfilled,
        (state, action: PayloadAction<CampaignSession>) => {
          state.starting = false;
          state.loaded = true;
          state.active = action.payload;
        },
      )
      .addCase(startSession.rejected, (state, action) => {
        state.starting = false;
        state.error = message(action.error, 'failed');
      })
      // Master (re)generated the scene — reflect the fresh map immediately.
      .addCase(
        generateSessionScene.fulfilled,
        (state, action: PayloadAction<CampaignMap>) => {
          if (state.active && state.active.map?.id === action.payload.id) {
            state.active.map = { ...state.active.map, ...action.payload };
          }
        },
      );
  },
});

export const {
  clearSession,
  setActiveSession,
  sessionMapSet,
  sessionPointMoved,
  sessionStarted,
  sessionSceneUpdate,
} = sessionSlice.actions;
export default sessionSlice.reducer;
