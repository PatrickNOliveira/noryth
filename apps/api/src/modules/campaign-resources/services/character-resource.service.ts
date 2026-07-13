import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { Character } from '@modules/characters/entities/character.entity';
import { CharacterFormService } from '@modules/character-forms/services/character-form.service';
import { CampaignResourceDefinition } from '../entities/campaign-resource-definition.entity';
import { CharacterResourceState } from '../entities/character-resource-state.entity';
import { CharacterResourceDto } from '../dto/character-resource.dto';
import { UpdateCharacterResourcesDto } from '../dto/update-character-resources.dto';
import {
  CAMPAIGN_RESOURCES_REPOSITORY,
  CampaignResourcesRepository,
} from '../repositories/campaign-resources.repository';

/**
 * Per-character resource states and their EFFECTIVE resolution against the active
 * form's max overrides. Master-only writes; reads honor player visibility. States
 * are lazily ensured on read, so a character created before a resource existed
 * still gets a default state the first time its resources are looked at.
 */
@Injectable()
export class CharacterResourceService {
  constructor(
    @Inject(CAMPAIGN_RESOURCES_REPOSITORY)
    private readonly repo: CampaignResourcesRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly forms: CharacterFormService,
  ) {}

  /** Effective resources for a character, honoring the viewer's role. */
  async list(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<CharacterResourceDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const character = await this.loadCharacter(campaignId, characterId);
    const isController = character.controlledByUserId === userId;
    if (!isMaster && !isController && !character.isVisibleToPlayers) {
      throw new NotFoundException('Personagem não encontrado');
    }

    const rows = await this.effective(character);
    // Players (not master, not controller) only see resources marked visible.
    return isMaster || isController
      ? rows
      : rows.filter((r) => r.isVisibleToPlayers);
  }

  /** Master sets a character's resource values (current + base max). */
  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    dto: UpdateCharacterResourcesDto,
  ): Promise<CharacterResourceDto[]> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const character = await this.loadCharacter(campaignId, characterId);

    const defs = await this.repo.findDefinitionsByCampaign(campaignId);
    const byId = new Map(defs.map((d) => [d.id, d]));

    for (const input of dto.resources) {
      const def = byId.get(input.resourceDefinitionId);
      if (!def) {
        throw new BadRequestException(
          'Um dos recursos informados não pertence a esta campanha.',
        );
      }
      if (input.maxValue < def.minValue) {
        throw new BadRequestException(
          `O máximo de "${def.name}" não pode ser menor que ${def.minValue}.`,
        );
      }
      if (input.currentValue < def.minValue) {
        throw new BadRequestException(
          `O valor atual de "${def.name}" não pode ser menor que ${def.minValue}.`,
        );
      }
      // Clamp current to the (possibly reduced) max.
      const currentValue = Math.min(input.currentValue, input.maxValue);

      const existing = await this.repo.findStateByCharacterAndDefinition(
        character.id,
        def.id,
      );
      if (existing) {
        existing.currentValue = currentValue;
        existing.maxValue = input.maxValue;
        await this.repo.saveState(existing);
      } else {
        await this.repo.saveState(
          this.repo.createState({
            campaignId,
            characterId: character.id,
            resourceDefinitionId: def.id,
            currentValue,
            maxValue: input.maxValue,
          }),
        );
      }
    }

    return this.effective(character);
  }

  /**
   * Seeds a state for a brand-new campaign resource across all existing
   * characters (called when a resource is created). Skips characters that already
   * have one. Reused shape as the lazy ensure.
   */
  async seedForDefinition(def: CampaignResourceDefinition): Promise<void> {
    const characters = await this.characters.findAllInCampaign(def.campaignId);
    const toCreate: CharacterResourceState[] = [];
    for (const character of characters) {
      const existing = await this.repo.findStateByCharacterAndDefinition(
        character.id,
        def.id,
      );
      if (!existing) toCreate.push(this.newState(character.id, def));
    }
    if (toCreate.length) await this.repo.saveStates(toCreate);
  }

  // ── helpers ─────────────────────────────────────────────────

  /**
   * Builds the effective resource list for a character: ensures a state exists
   * for every campaign resource, then applies the active form's max overrides.
   */
  private async effective(character: Character): Promise<CharacterResourceDto[]> {
    const defs = await this.repo.findDefinitionsByCampaign(character.campaignId);
    if (defs.length === 0) return [];

    const states = await this.ensureStates(character, defs);
    const stateByDef = new Map(states.map((s) => [s.resourceDefinitionId, s]));

    // Active form's max overrides (per resource), if any.
    const activeForm = await this.forms.getActiveForm(character);
    const overrideByDef = new Map<string, number>();
    if (activeForm) {
      const overrides = await this.repo.findOverridesByForm(activeForm.id);
      for (const o of overrides) overrideByDef.set(o.resourceDefinitionId, o.maxValue);
    }

    return defs.map((def) => {
      const state = stateByDef.get(def.id)!;
      const override = overrideByDef.get(def.id);
      const effectiveMaxValue = override ?? state.maxValue;
      return {
        resourceDefinitionId: def.id,
        name: def.name,
        description: def.description,
        type: def.type,
        minValue: def.minValue,
        currentValue: state.currentValue,
        baseMaxValue: state.maxValue,
        effectiveMaxValue,
        effectiveCurrentValue: Math.min(state.currentValue, effectiveMaxValue),
        isOverriddenByActiveForm: override !== undefined,
        isVisibleToPlayers: def.isVisibleToPlayers,
        displayOrder: def.displayOrder,
      };
    });
  }

  /** Loads the character's states, creating any missing ones with defaults. */
  private async ensureStates(
    character: Character,
    defs: CampaignResourceDefinition[],
  ): Promise<CharacterResourceState[]> {
    const existing = await this.repo.findStatesByCharacter(character.id);
    const byDef = new Map(existing.map((s) => [s.resourceDefinitionId, s]));
    const missing = defs
      .filter((d) => !byDef.has(d.id))
      .map((d) => this.newState(character.id, d));
    if (missing.length) {
      const saved = await this.repo.saveStates(missing);
      return [...existing, ...saved];
    }
    return existing;
  }

  private newState(
    characterId: string,
    def: CampaignResourceDefinition,
  ): CharacterResourceState {
    return this.repo.createState({
      campaignId: def.campaignId,
      characterId,
      resourceDefinitionId: def.id,
      maxValue: def.defaultMaxValue,
      currentValue: this.initialCurrent(def),
    });
  }

  private initialCurrent(def: CampaignResourceDefinition): number {
    switch (def.defaultCurrentValueStrategy) {
      case 'ZERO':
        return def.minValue;
      case 'CUSTOM':
        return this.clamp(
          def.defaultCurrentValue ?? def.defaultMaxValue,
          def.minValue,
          def.defaultMaxValue,
        );
      case 'MAX':
      default:
        return def.defaultMaxValue;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private async loadCharacter(
    campaignId: string,
    characterId: string,
  ): Promise<Character> {
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    return character;
  }
}
