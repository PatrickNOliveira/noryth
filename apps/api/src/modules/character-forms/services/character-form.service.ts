import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { CampaignAttributesService } from '@modules/campaign-attributes/services/campaign-attributes.service';
import { AbilitiesService } from '@modules/abilities/services/abilities.service';
import { Character } from '@modules/characters/entities/character.entity';
import { CharacterForm } from '../entities/character-form.entity';
import { CharacterFormDto, toCharacterFormDto } from '../dto/character-form.dto';
import {
  CreateCharacterFormDto,
  UpdateCharacterFormDto,
  UpdateFormAttributesDto,
  UpdateFormAbilitiesDto,
} from '../dto/form-input.dto';
import {
  CHARACTER_FORMS_REPOSITORY,
  CharacterFormsRepository,
} from '../repositories/character-forms.repository';

/**
 * Application service for alternative character forms (campaign preparation).
 * Master-only. Enforces at most one default and one active form per character,
 * and lazily creates a "Forma Padrão" for characters that have none yet (so
 * characters created before this feature keep working). Never touches session.
 */
@Injectable()
export class CharacterFormService {
  constructor(
    @Inject(CHARACTER_FORMS_REPOSITORY)
    private readonly forms: CharacterFormsRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly attributes: CampaignAttributesService,
    private readonly abilities: AbilitiesService,
  ) {}

  async list(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<CharacterFormDto[]> {
    const character = await this.assertMasterAndCharacter(userId, campaignId, characterId);
    await this.ensureDefaultForm(character);
    const list = await this.forms.findByCharacter(characterId);
    return Promise.all(list.map((f) => this.toDto(f)));
  }

  async create(
    userId: string,
    campaignId: string,
    characterId: string,
    dto: CreateCharacterFormDto,
  ): Promise<CharacterFormDto> {
    const character = await this.assertMasterAndCharacter(userId, campaignId, characterId);
    await this.ensureDefaultForm(character);
    const form = await this.forms.save(
      this.forms.create({
        campaignId,
        characterId,
        createdByUserId: userId,
        name: dto.name.trim(),
        shortDescription: dto.shortDescription?.trim() ?? '',
        appearanceDescription: dto.appearanceDescription.trim(),
        notes: dto.notes?.trim() ?? '',
        isDefault: false,
        isActive: false,
        usesBaseAbilities: dto.usesBaseAbilities ?? true,
        imageStatus: 'none',
      }),
    );
    return this.toDto(form);
  }

  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
    dto: UpdateCharacterFormDto,
  ): Promise<CharacterFormDto> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    if (dto.name !== undefined) form.name = dto.name.trim();
    if (dto.shortDescription !== undefined) form.shortDescription = dto.shortDescription.trim();
    if (dto.appearanceDescription !== undefined) {
      form.appearanceDescription = dto.appearanceDescription.trim();
    }
    if (dto.notes !== undefined) form.notes = dto.notes.trim();
    if (dto.usesBaseAbilities !== undefined) form.usesBaseAbilities = dto.usesBaseAbilities;
    const saved = await this.forms.save(form);
    return this.toDto(saved);
  }

  async remove(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<void> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    if (form.isDefault) {
      throw new ConflictException('Não é possível remover a forma padrão.');
    }
    if ((await this.forms.countByCharacter(characterId)) <= 1) {
      throw new ConflictException('Não é possível remover a única forma do personagem.');
    }
    const wasActive = form.isActive;
    await this.forms.remove(form);
    if (wasActive) {
      const def = await this.forms.findDefault(characterId);
      if (def) {
        await this.forms.clearActive(characterId);
        def.isActive = true;
        await this.forms.save(def);
      }
    }
  }

  async setDefault(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<CharacterFormDto> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    await this.forms.clearDefault(characterId);
    // Setting a form as default also makes it the active one.
    await this.forms.clearActive(characterId);
    form.isDefault = true;
    form.isActive = true;
    const saved = await this.forms.save(form);
    return this.toDto(saved);
  }

  async activate(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<CharacterFormDto> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    await this.forms.clearActive(characterId);
    form.isActive = true;
    const saved = await this.forms.save(form);
    return this.toDto(saved);
  }

  async updateAttributes(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
    dto: UpdateFormAttributesDto,
  ): Promise<CharacterFormDto> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    await this.assertAttributes(campaignId, dto.attributes);
    await this.forms.replaceValues(form.id, campaignId, dto.attributes);
    return this.toDto(form);
  }

  async updateAbilities(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
    dto: UpdateFormAbilitiesDto,
  ): Promise<CharacterFormDto> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    const ids = dto.usesBaseAbilities ? [] : [...new Set(dto.abilityDefinitionIds ?? [])];
    for (const id of ids) {
      const def = await this.abilities.findDefinitionInCampaign(campaignId, id);
      if (!def) {
        throw new BadRequestException(
          'Uma das habilidades informadas não pertence a esta campanha.',
        );
      }
    }
    form.usesBaseAbilities = dto.usesBaseAbilities;
    await this.forms.save(form);
    await this.forms.replaceAbilities(
      form.id,
      campaignId,
      ids.map((abilityDefinitionId) => ({
        abilityDefinitionId,
        isVisibleToPlayers: false,
      })),
    );
    return this.toDto(form);
  }

  /**
   * Grants a single ability to a form (used by the session "improvise ability"
   * flow when linking to the active form). Appends to the form's existing grants
   * — preserving their visibility — and flips the form to use its OWN abilities
   * (`usesBaseAbilities = false`) so the grant shows immediately in the form's
   * effective abilities. Master-only. Idempotent per (form, ability).
   */
  async linkAbility(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
    abilityDefinitionId: string,
    isVisibleToPlayers: boolean,
  ): Promise<CharacterFormDto> {
    await this.assertMasterAndCharacter(userId, campaignId, characterId);
    const form = await this.loadFormOrFail(characterId, formId);
    const def = await this.abilities.findDefinitionInCampaign(
      campaignId,
      abilityDefinitionId,
    );
    if (!def) {
      throw new BadRequestException(
        'A habilidade informada não pertence a esta campanha.',
      );
    }

    const existing = await this.forms.findAbilities(form.id);
    const merged = existing.map((a) => ({
      abilityDefinitionId: a.abilityDefinitionId,
      isVisibleToPlayers: a.isVisibleToPlayers,
    }));
    if (!merged.some((a) => a.abilityDefinitionId === abilityDefinitionId)) {
      merged.push({ abilityDefinitionId, isVisibleToPlayers });
    }

    // Linking straight to the form makes the form use its own abilities so the
    // new grant is part of the effective abilities right away.
    form.usesBaseAbilities = false;
    await this.forms.save(form);
    await this.forms.replaceAbilities(form.id, campaignId, merged);
    return this.toDto(form);
  }

  /** Loads a form for image generation (used by the image service). */
  async loadFormForImage(
    characterId: string,
    formId: string,
  ): Promise<CharacterForm> {
    return this.loadFormOrFail(characterId, formId);
  }

  /** Load a form scoped to a character (raw; permission is the caller's job). */
  getForm(characterId: string, formId: string): Promise<CharacterForm> {
    return this.loadFormOrFail(characterId, formId);
  }

  /** The active form (active ?? default), ensuring a default exists. */
  async getActiveForm(character: Character): Promise<CharacterForm | null> {
    await this.ensureDefaultForm(character);
    return (
      (await this.forms.findActive(character.id)) ??
      (await this.forms.findDefault(character.id))
    );
  }

  /** Number of forms a character has. */
  countForms(characterId: string): Promise<number> {
    return this.forms.countByCharacter(characterId);
  }

  // ── helpers ─────────────────────────────────────────────────

  private async toDto(form: CharacterForm): Promise<CharacterFormDto> {
    const [values, abilities] = await Promise.all([
      this.forms.findValues(form.id),
      this.forms.findAbilities(form.id),
    ]);
    return toCharacterFormDto(form, values, abilities);
  }

  private async ensureDefaultForm(character: Character): Promise<void> {
    if ((await this.forms.countByCharacter(character.id)) > 0) return;
    await this.forms.save(
      this.forms.create({
        campaignId: character.campaignId,
        characterId: character.id,
        createdByUserId: character.createdByUserId,
        name: 'Forma Padrão',
        shortDescription: character.shortDescription,
        appearanceDescription: character.appearance,
        isDefault: true,
        isActive: true,
        usesBaseAbilities: true,
        imagePath: character.imagePath,
        imageUrl: character.imageUrl,
        imageStatus: character.imageStatus,
      }),
    );
  }

  private async assertMasterAndCharacter(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<Character> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    return character;
  }

  private async loadFormOrFail(
    characterId: string,
    formId: string,
  ): Promise<CharacterForm> {
    const form = await this.forms.findById(formId);
    if (!form || form.characterId !== characterId) {
      throw new NotFoundException('Forma não encontrada');
    }
    return form;
  }

  private async assertAttributes(
    campaignId: string,
    attributes: { attributeId: string; value: number }[],
  ): Promise<void> {
    if (attributes.length === 0) return;
    const byId = new Map(
      (await this.attributes.getForCampaign(campaignId)).map((a) => [a.id, a]),
    );
    const seen = new Set<string>();
    for (const item of attributes) {
      if (seen.has(item.attributeId)) {
        throw new BadRequestException('Não é permitido repetir o mesmo atributo na forma.');
      }
      seen.add(item.attributeId);
      const attr = byId.get(item.attributeId);
      if (!attr) {
        throw new BadRequestException('Um dos atributos não pertence a esta campanha.');
      }
      if (item.value < attr.minValue || item.value > attr.maxValue) {
        throw new BadRequestException(
          `O valor de "${attr.name}" deve estar entre ${attr.minValue} e ${attr.maxValue}.`,
        );
      }
    }
  }
}
