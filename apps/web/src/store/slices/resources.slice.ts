import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resourceService } from '../../services/resource.service';
import {
  ResourceDefinition,
  CreateResourceInput,
  UpdateResourceInput,
} from '../../types/resource';
import { ApiError } from '../../services/api';

export interface ResourcesState {
  list: ResourceDefinition[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ResourcesState = {
  list: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchResources = createAsyncThunk(
  'resources/fetchList',
  (campaignId: string) => resourceService.list(campaignId),
);
export const createResource = createAsyncThunk(
  'resources/create',
  (args: { campaignId: string; input: CreateResourceInput }) =>
    resourceService.create(args.campaignId, args.input),
);
export const updateResource = createAsyncThunk(
  'resources/update',
  (args: { campaignId: string; resourceId: string; input: UpdateResourceInput }) =>
    resourceService.update(args.campaignId, args.resourceId, args.input),
);
export const removeResource = createAsyncThunk(
  'resources/remove',
  async (args: { campaignId: string; resourceId: string }) => {
    await resourceService.remove(args.campaignId, args.resourceId);
    return args.resourceId;
  },
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const sortResources = (list: ResourceDefinition[]) =>
  [...list].sort(
    (a, b) =>
      a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt),
  );

const resourcesSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    clearResources(state) {
      state.list = [];
      state.error = null;
    },
    clearResourcesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchResources.fulfilled,
        (state, action: PayloadAction<ResourceDefinition[]>) => {
          state.loading = false;
          state.list = sortResources(action.payload);
        },
      )
      .addCase(fetchResources.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(
        createResource.fulfilled,
        (state, action: PayloadAction<ResourceDefinition>) => {
          state.saving = false;
          state.list = sortResources([...state.list, action.payload]);
        },
      )
      .addCase(
        updateResource.fulfilled,
        (state, action: PayloadAction<ResourceDefinition>) => {
          state.saving = false;
          state.list = sortResources(
            state.list.map((r) =>
              r.id === action.payload.id ? action.payload : r,
            ),
          );
        },
      )
      .addCase(
        removeResource.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.saving = false;
          state.list = state.list.filter((r) => r.id !== action.payload);
        },
      );

    for (const thunk of [createResource, updateResource, removeResource]) {
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

export const { clearResources, clearResourcesError } = resourcesSlice.actions;
export default resourcesSlice.reducer;
