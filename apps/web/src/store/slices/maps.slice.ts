import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { mapService } from '../../services/map.service';
import {
  CampaignMap,
  MapImageStatus,
  MapPoint,
  CreateMapInput,
  UpdateMapInput,
  CreateMapPointInput,
  UpdateMapPointInput,
} from '../../types/map';
import { ApiError } from '../../services/api';

export interface MapsState {
  list: CampaignMap[];
  selected: CampaignMap | null;
  artDirection: string;
  artDirectionLoaded: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: MapsState = {
  list: [],
  selected: null,
  artDirection: '',
  artDirectionLoaded: false,
  loading: false,
  saving: false,
  error: null,
};

export const fetchMaps = createAsyncThunk('maps/fetchList', (campaignId: string) =>
  mapService.list(campaignId),
);

export const fetchMap = createAsyncThunk(
  'maps/fetchOne',
  (args: { campaignId: string; mapId: string }) =>
    mapService.getById(args.campaignId, args.mapId),
);

export const createMap = createAsyncThunk(
  'maps/create',
  (args: { campaignId: string; input: CreateMapInput }) =>
    mapService.create(args.campaignId, args.input),
);

export const updateMap = createAsyncThunk(
  'maps/update',
  (args: { campaignId: string; mapId: string; input: UpdateMapInput }) =>
    mapService.update(args.campaignId, args.mapId, args.input),
);

export const removeMap = createAsyncThunk(
  'maps/remove',
  async (args: { campaignId: string; mapId: string }) => {
    await mapService.remove(args.campaignId, args.mapId);
    return args.mapId;
  },
);

export const regenerateMapImage = createAsyncThunk(
  'maps/regenerateImage',
  (args: {
    campaignId: string;
    mapId: string;
    adjustments?: string;
    ignoreCampaignArtDirection?: boolean;
    includeLabels?: boolean;
  }) =>
    mapService.regenerateImage(args.campaignId, args.mapId, {
      adjustments: args.adjustments,
      ignoreCampaignArtDirection: args.ignoreCampaignArtDirection,
      includeLabels: args.includeLabels,
    }),
);

export const fetchMapArtDirection = createAsyncThunk(
  'maps/fetchArtDirection',
  (campaignId: string) => mapService.getArtDirection(campaignId),
);
export const saveMapArtDirection = createAsyncThunk(
  'maps/saveArtDirection',
  (args: { campaignId: string; value: string }) =>
    mapService.setArtDirection(args.campaignId, args.value),
);
export const clearMapArtDirection = createAsyncThunk(
  'maps/clearArtDirection',
  (campaignId: string) => mapService.clearArtDirection(campaignId),
);

export const createMapPoint = createAsyncThunk(
  'maps/createPoint',
  (args: { campaignId: string; mapId: string; input: CreateMapPointInput }) =>
    mapService.createPoint(args.campaignId, args.mapId, args.input),
);
export const updateMapPoint = createAsyncThunk(
  'maps/updatePoint',
  (args: {
    campaignId: string;
    mapId: string;
    pointId: string;
    input: UpdateMapPointInput;
  }) =>
    mapService.updatePoint(args.campaignId, args.mapId, args.pointId, args.input),
);
export const removeMapPoint = createAsyncThunk(
  'maps/removePoint',
  async (args: { campaignId: string; mapId: string; pointId: string }) => {
    await mapService.removePoint(args.campaignId, args.mapId, args.pointId);
    return args.pointId;
  },
);

interface ImageUpdate {
  mapId: string;
  imageStatus: MapImageStatus;
  imageUrl?: string | null;
  imageError?: string | null;
}

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const mapsSlice = createSlice({
  name: 'maps',
  initialState,
  reducers: {
    clearSelectedMap(state) {
      state.selected = null;
    },
    mapImageUpdate(state, action: PayloadAction<ImageUpdate>) {
      const { mapId, imageStatus, imageUrl, imageError } = action.payload;
      const patch = (m: CampaignMap) => {
        m.imageStatus = imageStatus;
        if (imageUrl !== undefined) m.imageUrl = imageUrl;
        if (imageError !== undefined) m.imageError = imageError ?? null;
      };
      if (state.selected?.id === mapId) patch(state.selected);
      const inList = state.list.find((m) => m.id === mapId);
      if (inList) patch(inList);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMaps.fulfilled, (state, action: PayloadAction<CampaignMap[]>) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchMaps.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(fetchMap.pending, (state) => {
        if (!state.selected) state.loading = true;
        state.error = null;
      })
      .addCase(fetchMap.fulfilled, (state, action: PayloadAction<CampaignMap>) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchMap.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(createMap.fulfilled, (state, action: PayloadAction<CampaignMap>) => {
        state.saving = false;
        state.list.push(action.payload);
        state.selected = action.payload;
      })
      .addCase(removeMap.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.list = state.list.filter((m) => m.id !== action.payload);
        if (state.selected?.id === action.payload) state.selected = null;
      })
      // art direction
      .addCase(fetchMapArtDirection.fulfilled, (state, action: PayloadAction<string>) => {
        state.artDirection = action.payload;
        state.artDirectionLoaded = true;
      })
      .addCase(saveMapArtDirection.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.artDirection = action.payload;
        state.artDirectionLoaded = true;
      })
      .addCase(clearMapArtDirection.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.artDirection = action.payload;
        state.artDirectionLoaded = true;
      })
      // point mutations update selected.points
      .addCase(createMapPoint.fulfilled, (state, action: PayloadAction<MapPoint>) => {
        state.saving = false;
        if (state.selected?.id === action.payload.mapId) {
          state.selected.points = [...(state.selected.points ?? []), action.payload];
        }
      })
      .addCase(updateMapPoint.fulfilled, (state, action: PayloadAction<MapPoint>) => {
        state.saving = false;
        if (state.selected?.points) {
          state.selected.points = state.selected.points.map((p) =>
            p.id === action.payload.id ? action.payload : p,
          );
        }
      })
      .addCase(removeMapPoint.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        if (state.selected?.points) {
          state.selected.points = state.selected.points.filter(
            (p) => p.id !== action.payload,
          );
        }
      });

    // Map updates that return the fresh map.
    for (const thunk of [updateMap, regenerateMapImage]) {
      builder.addCase(thunk.fulfilled, (state, action: PayloadAction<CampaignMap>) => {
        state.saving = false;
        // Preserve already-loaded points on the selected detail.
        const points = state.selected?.id === action.payload.id
          ? action.payload.points ?? state.selected?.points
          : action.payload.points;
        state.selected =
          state.selected?.id === action.payload.id
            ? { ...action.payload, points }
            : state.selected;
        state.list = state.list.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload, points: undefined } : m,
        );
      });
    }

    for (const thunk of [
      createMap,
      updateMap,
      removeMap,
      regenerateMapImage,
      saveMapArtDirection,
      clearMapArtDirection,
      createMapPoint,
      updateMapPoint,
      removeMapPoint,
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

export const { clearSelectedMap, mapImageUpdate } = mapsSlice.actions;
export default mapsSlice.reducer;
