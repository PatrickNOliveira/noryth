import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { CharacterFormService } from '@modules/character-forms/services/character-form.service';
import { FormResourceOverrideDto } from '../dto/update-form-resources.dto';
import { UpdateFormResourcesDto } from '../dto/update-form-resources.dto';
import {
  CAMPAIGN_RESOURCES_REPOSITORY,
  CampaignResourcesRepository,
  FormResourceOverrideInput,
} from '../repositories/campaign-resources.repository';

/**
 * Per-form resource MAX overrides. Master-only. A form may cap a resource's
 * maximum; a missing override falls back to the character's base max (resolved in
 * {@link CharacterResourceService}). This never changes the current value.
 */
@Injectable()
export class CharacterFormResourceService {
  constructor(
    @Inject(CAMPAIGN_RESOURCES_REPOSITORY)
    private readonly repo: CampaignResourcesRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly forms: CharacterFormService,
  ) {}

  /** The form's overrides alongside every campaign resource (master only). */
  async list(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<FormResourceOverrideDto[]> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    await this.assertForm(campaignId, characterId, formId);

    const defs = await this.repo.findDefinitionsByCampaign(campaignId);
    const overrides = await this.repo.findOverridesByForm(formId);
    const overrideByDef = new Map(
      overrides.map((o) => [o.resourceDefinitionId, o.maxValue]),
    );
    const states = await this.repo.findStatesByCharacter(characterId);
    const baseByDef = new Map(states.map((s) => [s.resourceDefinitionId, s.maxValue]));

    return defs.map((def) => ({
      resourceDefinitionId: def.id,
      name: def.name,
      minValue: def.minValue,
      baseMaxValue: baseByDef.get(def.id) ?? def.defaultMaxValue,
      maxValue: overrideByDef.get(def.id) ?? null,
      displayOrder: def.displayOrder,
    }));
  }

  /** Replaces the form's overrides. `maxValue = null` removes an override. */
  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    formId: string,
    dto: UpdateFormResourcesDto,
  ): Promise<FormResourceOverrideDto[]> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    await this.assertForm(campaignId, characterId, formId);

    const defs = await this.repo.findDefinitionsByCampaign(campaignId);
    const byId = new Map(defs.map((d) => [d.id, d]));

    const inputs: FormResourceOverrideInput[] = [];
    for (const item of dto.resources) {
      const def = byId.get(item.resourceDefinitionId);
      if (!def) {
        throw new BadRequestException(
          'Um dos recursos informados não pertence a esta campanha.',
        );
      }
      if (item.maxValue === null || item.maxValue === undefined) continue; // no override
      if (item.maxValue < def.minValue) {
        throw new BadRequestException(
          `O máximo de "${def.name}" nesta forma não pode ser menor que ${def.minValue}.`,
        );
      }
      inputs.push({ resourceDefinitionId: def.id, maxValue: item.maxValue });
    }

    await this.repo.replaceOverridesForForm(formId, campaignId, inputs);
    return this.list(userId, campaignId, characterId, formId);
  }

  private async assertForm(
    campaignId: string,
    characterId: string,
    formId: string,
  ): Promise<void> {
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    // Throws NotFound when the form doesn't belong to this character.
    await this.forms.getForm(characterId, formId);
  }
}
