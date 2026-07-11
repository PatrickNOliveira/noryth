import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { sessionService } from '../../services/session.service';
import {
  SessionCharacter,
  SpriteDirection,
  SpriteImageStatus,
  AddSessionCharacterInput,
  UpdateSessionCharacterInput,
} from '../../types/session';
import { ApiError } from '../../services/api';

export interface SessionCharactersState {
  list: SessionCharacter[];
  loading: boolean;
  error: string | null;
}

const initialState: SessionCharactersState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchSessionCharacters = createAsyncThunk(
  'sessionCharacters/fetch',
  (campaignId: string) => sessionService.listCharacters(campaignId),
);

export const addSessionCharacter = createAsyncThunk(
  'sessionCharacters/add',
  (args: { campaignId: string; input: AddSessionCharacterInput }) =>
    sessionService.addCharacter(args.campaignId, args.input),
);

export const updateSessionCharacter = createAsyncThunk(
  'sessionCharacters/update',
  (args: {
    campaignId: string;
    id: string;
    input: UpdateSessionCharacterInput;
  }) => sessionService.updateCharacter(args.campaignId, args.id, args.input),
);

export const removeSessionCharacter = createAsyncThunk(
  'sessionCharacters/remove',
  async (args: { campaignId: string; id: string }) => {
    await sessionService.removeCharacter(args.campaignId, args.id);
    return args.id;
  },
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

function upsert(state: SessionCharactersState, ch: SessionCharacter) {
  const i = state.list.findIndex((c) => c.id === ch.id);
  if (i >= 0) state.list[i] = ch;
  else state.list.push(ch);
}

const slice = createSlice({
  name: 'sessionCharacters',
  initialState,
  reducers: {
    clearSessionCharacters(state) {
      state.list = [];
      state.error = null;
    },
    /** Optimistic placement: shown immediately, before the server confirms. */
    sessionCharacterAddedOptimistic(
      state,
      action: PayloadAction<SessionCharacter>,
    ) {
      state.list.push(action.payload);
    },
    /**
     * Confirm a placement (from the POST response OR realtime `added`). Drops any
     * optimistic placeholder for the same character, then upserts the real row by
     * id — so it never duplicates, whatever order the two arrive in.
     */
    sessionCharacterConfirmed(state, action: PayloadAction<SessionCharacter>) {
      const real = action.payload;
      state.list = state.list.filter(
        (c) => !(c.isOptimistic && c.characterId === real.characterId),
      );
      upsert(state, real);
    },
    /** Remove an optimistic placeholder (e.g. the add request failed). */
    sessionCharacterAddFailed(state, action: PayloadAction<{ optimisticId: string }>) {
      state.list = state.list.filter(
        (c) => !(c.isOptimistic && c.id === action.payload.optimisticId),
      );
    },
    /** Optimistic field patch (facing / visibility) applied immediately. */
    sessionCharacterPatched(
      state,
      action: PayloadAction<{
        id: string;
        facing?: SpriteDirection;
        isVisibleToPlayers?: boolean;
      }>,
    ) {
      const c = state.list.find((x) => x.id === action.payload.id);
      if (!c) return;
      if (action.payload.facing !== undefined) c.facing = action.payload.facing;
      if (action.payload.isVisibleToPlayers !== undefined) {
        c.isVisibleToPlayers = action.payload.isVisibleToPlayers;
      }
    },
    /** Restore a character after a failed optimistic remove. */
    sessionCharacterRestored(state, action: PayloadAction<SessionCharacter>) {
      upsert(state, action.payload);
    },
    /** Realtime `session.character.moved`. */
    sessionCharacterMoved(
      state,
      action: PayloadAction<{
        sessionCharacterId: string;
        x: number;
        y: number;
        facing: SpriteDirection;
        sizeScale?: number;
      }>,
    ) {
      const c = state.list.find((x) => x.id === action.payload.sessionCharacterId);
      if (c) {
        c.x = action.payload.x;
        c.y = action.payload.y;
        c.facing = action.payload.facing;
        if (action.payload.sizeScale != null) c.sizeScale = action.payload.sizeScale;
      }
    },
    /** Local optimistic resize while dragging the slider (no round-trip yet). */
    sessionCharacterSized(
      state,
      action: PayloadAction<{ id: string; sizeScale: number }>,
    ) {
      const c = state.list.find((x) => x.id === action.payload.id);
      if (c) c.sizeScale = action.payload.sizeScale;
    },
    /** Realtime `session.character.removed`. */
    sessionCharacterRemoved(
      state,
      action: PayloadAction<{ sessionCharacterId: string }>,
    ) {
      state.list = state.list.filter(
        (c) => c.id !== action.payload.sessionCharacterId,
      );
    },
    /** Local optimistic move while dragging (no server round-trip yet). */
    sessionCharacterDragged(
      state,
      action: PayloadAction<{ id: string; x: number; y: number }>,
    ) {
      const c = state.list.find((x) => x.id === action.payload.id);
      if (c) {
        c.x = action.payload.x;
        c.y = action.payload.y;
      }
    },
    /** Realtime `character.session_sprite.*` — patch sprites for a character. */
    sessionSpriteUpdated(
      state,
      action: PayloadAction<{
        characterId: string;
        direction: SpriteDirection;
        imageUrl?: string | null;
        status: SpriteImageStatus;
      }>,
    ) {
      const { characterId, direction, imageUrl, status } = action.payload;
      for (const c of state.list) {
        if (c.characterId !== characterId) continue;
        const s = c.sprites.find((sp) => sp.direction === direction);
        if (s) {
          s.imageStatus = status;
          if (imageUrl !== undefined) s.imageUrl = imageUrl;
        } else {
          c.sprites.push({ direction, imageStatus: status, imageUrl: imageUrl ?? null });
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessionCharacters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSessionCharacters.fulfilled,
        (state, action: PayloadAction<SessionCharacter[]>) => {
          state.loading = false;
          state.list = action.payload;
        },
      )
      .addCase(fetchSessionCharacters.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(
        addSessionCharacter.fulfilled,
        (state, action: PayloadAction<SessionCharacter>) => {
          upsert(state, action.payload);
        },
      )
      .addCase(
        updateSessionCharacter.fulfilled,
        (state, action: PayloadAction<SessionCharacter>) => {
          upsert(state, action.payload);
        },
      )
      .addCase(
        removeSessionCharacter.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.list = state.list.filter((c) => c.id !== action.payload);
        },
      );
  },
});

export const {
  clearSessionCharacters,
  sessionCharacterAddedOptimistic,
  sessionCharacterConfirmed,
  sessionCharacterAddFailed,
  sessionCharacterPatched,
  sessionCharacterRestored,
  sessionCharacterMoved,
  sessionCharacterRemoved,
  sessionCharacterDragged,
  sessionCharacterSized,
  sessionSpriteUpdated,
} = slice.actions;
export default slice.reducer;
