import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { characterService } from '../../services/character.service';
import {
  Character,
  CharacterImageStatus,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '../../types/character';
import { ApiError } from '../../services/api';

export interface CharactersState {
  list: Character[];
  selected: Character | null;
  artDirection: string;
  artDirectionLoaded: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: CharactersState = {
  list: [],
  selected: null,
  artDirection: '',
  artDirectionLoaded: false,
  loading: false,
  saving: false,
  error: null,
};

export const fetchCharacters = createAsyncThunk(
  'characters/fetchList',
  (campaignId: string) => characterService.list(campaignId),
);

export const fetchCharacter = createAsyncThunk(
  'characters/fetchOne',
  (args: { campaignId: string; characterId: string }) =>
    characterService.getById(args.campaignId, args.characterId),
);

export const createCharacter = createAsyncThunk(
  'characters/create',
  (args: { campaignId: string; input: CreateCharacterInput }) =>
    characterService.create(args.campaignId, args.input),
);

export const updateCharacter = createAsyncThunk(
  'characters/update',
  (args: {
    campaignId: string;
    characterId: string;
    input: UpdateCharacterInput;
  }) => characterService.update(args.campaignId, args.characterId, args.input),
);

export const removeCharacter = createAsyncThunk(
  'characters/remove',
  async (args: { campaignId: string; characterId: string }) => {
    await characterService.remove(args.campaignId, args.characterId);
    return args.characterId;
  },
);

export const generateCharacterImage = createAsyncThunk(
  'characters/generateImage',
  (args: { campaignId: string; characterId: string }) =>
    characterService.generateImage(args.campaignId, args.characterId),
);

export const regenerateCharacterImage = createAsyncThunk(
  'characters/regenerateImage',
  (args: {
    campaignId: string;
    characterId: string;
    adjustments?: string;
    ignoreCampaignArtDirection?: boolean;
  }) =>
    characterService.regenerateImage(args.campaignId, args.characterId, {
      adjustments: args.adjustments,
      ignoreCampaignArtDirection: args.ignoreCampaignArtDirection,
    }),
);

export const fetchArtDirection = createAsyncThunk(
  'characters/fetchArtDirection',
  (campaignId: string) => characterService.getArtDirection(campaignId),
);

export const saveArtDirection = createAsyncThunk(
  'characters/saveArtDirection',
  (args: { campaignId: string; value: string }) =>
    characterService.setArtDirection(args.campaignId, args.value),
);

export const clearArtDirection = createAsyncThunk(
  'characters/clearArtDirection',
  (campaignId: string) => characterService.clearArtDirection(campaignId),
);

interface ImageUpdate {
  characterId: string;
  imageStatus: CharacterImageStatus;
  imageUrl?: string | null;
  imageError?: string | null;
}

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const charactersSlice = createSlice({
  name: 'characters',
  initialState,
  reducers: {
    clearSelectedCharacter(state) {
      state.selected = null;
    },
    /** Realtime: patch a character's portrait state without a refetch. */
    characterImageUpdate(state, action: PayloadAction<ImageUpdate>) {
      const { characterId, imageStatus, imageUrl, imageError } = action.payload;
      const patch = (c: Character) => {
        c.imageStatus = imageStatus;
        if (imageUrl !== undefined) c.imageUrl = imageUrl;
        if (imageError !== undefined) c.imageError = imageError ?? null;
      };
      if (state.selected?.id === characterId) patch(state.selected);
      const inList = state.list.find((c) => c.id === characterId);
      if (inList) patch(inList);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCharacters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCharacters.fulfilled,
        (state, action: PayloadAction<Character[]>) => {
          state.loading = false;
          state.list = action.payload;
        },
      )
      .addCase(fetchCharacters.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(fetchCharacter.pending, (state) => {
        if (!state.selected) state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCharacter.fulfilled,
        (state, action: PayloadAction<Character>) => {
          state.loading = false;
          state.selected = action.payload;
        },
      )
      .addCase(fetchCharacter.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(
        createCharacter.fulfilled,
        (state, action: PayloadAction<Character>) => {
          state.saving = false;
          state.list.unshift(action.payload);
          state.selected = action.payload;
        },
      )
      .addCase(
        removeCharacter.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.saving = false;
          state.list = state.list.filter((c) => c.id !== action.payload);
          if (state.selected?.id === action.payload) state.selected = null;
        },
      );

    for (const thunk of [
      updateCharacter,
      generateCharacterImage,
      regenerateCharacterImage,
    ]) {
      builder.addCase(
        thunk.fulfilled,
        (state, action: PayloadAction<Character>) => {
          state.saving = false;
          state.selected = action.payload;
          state.list = state.list.map((c) =>
            c.id === action.payload.id ? action.payload : c,
          );
        },
      );
    }

    builder
      .addCase(
        fetchArtDirection.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.artDirection = action.payload;
          state.artDirectionLoaded = true;
        },
      )
      .addCase(
        saveArtDirection.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.saving = false;
          state.artDirection = action.payload;
          state.artDirectionLoaded = true;
        },
      )
      .addCase(
        clearArtDirection.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.saving = false;
          state.artDirection = action.payload;
          state.artDirectionLoaded = true;
        },
      );

    for (const thunk of [
      createCharacter,
      updateCharacter,
      removeCharacter,
      generateCharacterImage,
      regenerateCharacterImage,
      saveArtDirection,
      clearArtDirection,
    ]) {
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

export const { clearSelectedCharacter, characterImageUpdate } =
  charactersSlice.actions;
export default charactersSlice.reducer;
