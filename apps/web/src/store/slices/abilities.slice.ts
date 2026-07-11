import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { abilityService } from '../../services/ability.service';
import {
  AbilityDefinition,
  CharacterAbility,
  CreateAbilityInput,
  UpdateAbilityInput,
  ProposeAbilityInput,
  UpdateProposalInput,
  AssignAbilityInput,
} from '../../types/ability';
import { ApiError } from '../../services/api';

export interface AbilitiesState {
  list: AbilityDefinition[];
  pending: AbilityDefinition[];
  selected: AbilityDefinition | null;
  characterAbilities: CharacterAbility[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AbilitiesState = {
  list: [],
  pending: [],
  selected: null,
  characterAbilities: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchAbilities = createAsyncThunk('abilities/fetchList', (campaignId: string) =>
  abilityService.list(campaignId),
);
export const fetchPendingAbilities = createAsyncThunk('abilities/fetchPending', (campaignId: string) =>
  abilityService.listPending(campaignId),
);
export const fetchAbility = createAsyncThunk(
  'abilities/fetchOne',
  (args: { campaignId: string; id: string }) => abilityService.getById(args.campaignId, args.id),
);
export const createAbility = createAsyncThunk(
  'abilities/create',
  (args: { campaignId: string; input: CreateAbilityInput }) => abilityService.create(args.campaignId, args.input),
);
export const updateAbility = createAsyncThunk(
  'abilities/update',
  (args: { campaignId: string; id: string; input: UpdateAbilityInput }) =>
    abilityService.update(args.campaignId, args.id, args.input),
);
export const removeAbility = createAsyncThunk(
  'abilities/remove',
  async (args: { campaignId: string; id: string }) => {
    await abilityService.remove(args.campaignId, args.id);
    return args.id;
  },
);
export const approveAbility = createAsyncThunk(
  'abilities/approve',
  (args: { campaignId: string; id: string; reviewNotes?: string }) =>
    abilityService.approve(args.campaignId, args.id, args.reviewNotes),
);
export const rejectAbility = createAsyncThunk(
  'abilities/reject',
  (args: { campaignId: string; id: string; reviewNotes?: string }) =>
    abilityService.reject(args.campaignId, args.id, args.reviewNotes),
);
export const requestAbilityChanges = createAsyncThunk(
  'abilities/requestChanges',
  (args: { campaignId: string; id: string; reviewNotes?: string }) =>
    abilityService.requestChanges(args.campaignId, args.id, args.reviewNotes),
);
export const proposeAbility = createAsyncThunk(
  'abilities/propose',
  (args: { campaignId: string; characterId: string; input: ProposeAbilityInput }) =>
    abilityService.propose(args.campaignId, args.characterId, args.input),
);
export const updateProposal = createAsyncThunk(
  'abilities/updateProposal',
  (args: { campaignId: string; characterId: string; id: string; input: UpdateProposalInput }) =>
    abilityService.updateProposal(args.campaignId, args.characterId, args.id, args.input),
);
export const fetchCharacterAbilities = createAsyncThunk(
  'abilities/fetchCharacter',
  (args: { campaignId: string; characterId: string }) =>
    abilityService.listCharacterAbilities(args.campaignId, args.characterId),
);
export const assignAbility = createAsyncThunk(
  'abilities/assign',
  (args: { campaignId: string; characterId: string; input: AssignAbilityInput }) =>
    abilityService.assign(args.campaignId, args.characterId, args.input),
);
export const removeCharacterAbility = createAsyncThunk(
  'abilities/removeLink',
  async (args: { campaignId: string; characterId: string; linkId: string }) => {
    await abilityService.removeFromCharacter(args.campaignId, args.characterId, args.linkId);
    return args.linkId;
  },
);

const message = (err: unknown, fallback: string) =>
  (err as ApiError)?.message ?? fallback;

const isPending = (d: AbilityDefinition) =>
  d.approvalStatus === 'PENDING_APPROVAL' || d.approvalStatus === 'CHANGES_REQUESTED';

const abilitiesSlice = createSlice({
  name: 'abilities',
  initialState,
  reducers: {
    clearSelectedAbility(state) {
      state.selected = null;
    },
    clearCharacterAbilities(state) {
      state.characterAbilities = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAbilities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAbilities.fulfilled, (state, action: PayloadAction<AbilityDefinition[]>) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAbilities.rejected, (state, action) => {
        state.loading = false;
        state.error = message(action.error, 'failed');
      })
      .addCase(fetchPendingAbilities.fulfilled, (state, action: PayloadAction<AbilityDefinition[]>) => {
        state.pending = action.payload;
      })
      .addCase(fetchAbility.fulfilled, (state, action: PayloadAction<AbilityDefinition>) => {
        state.selected = action.payload;
      })
      .addCase(createAbility.fulfilled, (state, action: PayloadAction<AbilityDefinition>) => {
        state.saving = false;
        state.list.unshift(action.payload);
        state.selected = action.payload;
      })
      .addCase(removeAbility.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.list = state.list.filter((d) => d.id !== action.payload);
        state.pending = state.pending.filter((d) => d.id !== action.payload);
      })
      .addCase(fetchCharacterAbilities.fulfilled, (state, action: PayloadAction<CharacterAbility[]>) => {
        state.characterAbilities = action.payload;
      })
      .addCase(assignAbility.fulfilled, (state, action: PayloadAction<CharacterAbility>) => {
        state.saving = false;
        state.characterAbilities.push(action.payload);
      })
      .addCase(removeCharacterAbility.fulfilled, (state, action: PayloadAction<string>) => {
        state.saving = false;
        state.characterAbilities = state.characterAbilities.filter((l) => l.id !== action.payload);
      });

    // Any mutation returning a fresh definition: upsert into list + pending.
    for (const thunk of [
      updateAbility,
      approveAbility,
      rejectAbility,
      requestAbilityChanges,
      proposeAbility,
      updateProposal,
    ]) {
      builder.addCase(thunk.fulfilled, (state, action: PayloadAction<AbilityDefinition>) => {
        state.saving = false;
        const d = action.payload;
        const i = state.list.findIndex((x) => x.id === d.id);
        if (i >= 0) state.list[i] = d;
        else state.list.unshift(d);
        state.pending = state.pending.filter((x) => x.id !== d.id);
        if (isPending(d)) state.pending.unshift(d);
        if (state.selected?.id === d.id) state.selected = d;
      });
    }

    for (const thunk of [
      createAbility,
      updateAbility,
      removeAbility,
      approveAbility,
      rejectAbility,
      requestAbilityChanges,
      proposeAbility,
      updateProposal,
      assignAbility,
      removeCharacterAbility,
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

export const { clearSelectedAbility, clearCharacterAbilities } = abilitiesSlice.actions;
export default abilitiesSlice.reducer;
