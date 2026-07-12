import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { itemService } from '../../services/item.service';
import {
  ItemDefinition,
  ItemImageStatus,
  ItemInstance,
  CreateItemDefinitionInput,
  UpdateItemDefinitionInput,
  CreateItemInstanceInput,
  UpdateItemInstanceInput,
} from '../../types/item';
import { ApiError } from '../../services/api';

export interface ItemsState {
  list: ItemDefinition[];
  selected: ItemDefinition | null;
  /** Instances of the currently-open definition. */
  instances: ItemInstance[];
  artDirection: string;
  artDirectionLoaded: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ItemsState = {
  list: [],
  selected: null,
  instances: [],
  artDirection: '',
  artDirectionLoaded: false,
  loading: false,
  saving: false,
  error: null,
};

export const fetchItems = createAsyncThunk('items/fetchList', (campaignId: string) =>
  itemService.list(campaignId),
);
export const fetchItem = createAsyncThunk(
  'items/fetchOne',
  (args: { campaignId: string; id: string }) =>
    itemService.getById(args.campaignId, args.id),
);
export const createItem = createAsyncThunk(
  'items/create',
  (args: { campaignId: string; input: CreateItemDefinitionInput }) =>
    itemService.create(args.campaignId, args.input),
);
export const updateItem = createAsyncThunk(
  'items/update',
  (args: { campaignId: string; id: string; input: UpdateItemDefinitionInput }) =>
    itemService.update(args.campaignId, args.id, args.input),
);
export const removeItem = createAsyncThunk(
  'items/remove',
  async (args: { campaignId: string; id: string }) => {
    await itemService.remove(args.campaignId, args.id);
    return args.id;
  },
);
export const regenerateItemImage = createAsyncThunk(
  'items/regenerateImage',
  (args: {
    campaignId: string;
    id: string;
    adjustments?: string;
    ignoreCampaignArtDirection?: boolean;
  }) =>
    itemService.regenerateImage(args.campaignId, args.id, {
      adjustments: args.adjustments,
      ignoreCampaignArtDirection: args.ignoreCampaignArtDirection,
    }),
);

export const fetchItemArtDirection = createAsyncThunk(
  'items/fetchArtDirection',
  (campaignId: string) => itemService.getArtDirection(campaignId),
);
export const saveItemArtDirection = createAsyncThunk(
  'items/saveArtDirection',
  (args: { campaignId: string; value: string }) =>
    itemService.setArtDirection(args.campaignId, args.value),
);
export const clearItemArtDirection = createAsyncThunk(
  'items/clearArtDirection',
  (campaignId: string) => itemService.clearArtDirection(campaignId),
);

export const fetchInstances = createAsyncThunk(
  'items/fetchInstances',
  (args: { campaignId: string; itemDefinitionId: string }) =>
    itemService.listInstances(args.campaignId, args.itemDefinitionId),
);
export const createInstance = createAsyncThunk(
  'items/createInstance',
  (args: { campaignId: string; input: CreateItemInstanceInput }) =>
    itemService.createInstance(args.campaignId, args.input),
);
export const updateInstance = createAsyncThunk(
  'items/updateInstance',
  (args: { campaignId: string; id: string; input: UpdateItemInstanceInput }) =>
    itemService.updateInstance(args.campaignId, args.id, args.input),
);
export const removeInstance = createAsyncThunk(
  'items/removeInstance',
  async (args: { campaignId: string; id: string }) => {
    await itemService.removeInstance(args.campaignId, args.id);
    return args.id;
  },
);

interface ImageUpdate {
  itemDefinitionId: string;
  imageStatus: ItemImageStatus;
  imageUrl?: string | null;
  imageError?: string | null;
}

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const itemsSlice = createSlice({
  name: 'items',
  initialState,
  reducers: {
    clearSelectedItem(state) {
      state.selected = null;
      state.instances = [];
    },
    /**
     * Insert or replace a definition in the list without a refetch — used when an
     * item is improvised during a session, so it is immediately available.
     */
    itemUpserted(state, action: PayloadAction<ItemDefinition>) {
      const idx = state.list.findIndex((d) => d.id === action.payload.id);
      if (idx >= 0) state.list[idx] = action.payload;
      else state.list.unshift(action.payload);
    },
    itemImageUpdate(state, action: PayloadAction<ImageUpdate>) {
      const { itemDefinitionId, imageStatus, imageUrl, imageError } = action.payload;
      const patch = (d: ItemDefinition) => {
        d.imageStatus = imageStatus;
        if (imageUrl !== undefined) d.imageUrl = imageUrl;
        if (imageError !== undefined) d.imageError = imageError ?? null;
      };
      if (state.selected?.id === itemDefinitionId) patch(state.selected);
      const inList = state.list.find((d) => d.id === itemDefinitionId);
      if (inList) patch(inList);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action: PayloadAction<ItemDefinition[]>) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(fetchItem.pending, (state) => {
        if (!state.selected) state.loading = true;
        state.error = null;
      })
      .addCase(fetchItem.fulfilled, (state, action: PayloadAction<ItemDefinition>) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchItem.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(createItem.fulfilled, (state, action: PayloadAction<ItemDefinition>) => {
        state.saving = false;
        state.list.unshift(action.payload);
        state.selected = action.payload;
      })
      .addCase(removeItem.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.list = state.list.filter((d) => d.id !== action.payload);
        if (state.selected?.id === action.payload) state.selected = null;
      })
      .addCase(fetchInstances.fulfilled, (state, action: PayloadAction<ItemInstance[]>) => {
        state.instances = action.payload;
      })
      .addCase(createInstance.fulfilled, (state, action: PayloadAction<ItemInstance>) => {
        state.saving = false;
        state.instances.push(action.payload);
      })
      .addCase(updateInstance.fulfilled, (state, action: PayloadAction<ItemInstance>) => {
        state.saving = false;
        state.instances = state.instances.map((i) =>
          i.id === action.payload.id ? action.payload : i,
        );
      })
      .addCase(removeInstance.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.instances = state.instances.filter((i) => i.id !== action.payload);
      })
      .addCase(fetchItemArtDirection.fulfilled, (state, action: PayloadAction<string>) => {
        state.artDirection = action.payload;
        state.artDirectionLoaded = true;
      })
      .addCase(saveItemArtDirection.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.artDirection = action.payload;
        state.artDirectionLoaded = true;
      })
      .addCase(clearItemArtDirection.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.artDirection = action.payload;
        state.artDirectionLoaded = true;
      });

    for (const thunk of [updateItem, regenerateItemImage]) {
      builder.addCase(thunk.fulfilled, (state, action: PayloadAction<ItemDefinition>) => {
        state.saving = false;
        if (state.selected?.id === action.payload.id) state.selected = action.payload;
        state.list = state.list.map((d) =>
          d.id === action.payload.id ? action.payload : d,
        );
      });
    }

    for (const thunk of [
      createItem,
      updateItem,
      removeItem,
      regenerateItemImage,
      saveItemArtDirection,
      clearItemArtDirection,
      createInstance,
      updateInstance,
      removeInstance,
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

export const { clearSelectedItem, itemImageUpdate, itemUpserted } =
  itemsSlice.actions;
export default itemsSlice.reducer;
