import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CampaignResourceDefinition } from '../entities/campaign-resource-definition.entity';
import { CharacterResourceState } from '../entities/character-resource-state.entity';
import { CharacterFormResourceOverride } from '../entities/character-form-resource-override.entity';
import {
  CampaignResourcesRepository,
  FormResourceOverrideInput,
} from './campaign-resources.repository';

/** TypeORM adapter for {@link CampaignResourcesRepository}. */
@Injectable()
export class TypeOrmCampaignResourcesRepository
  implements CampaignResourcesRepository
{
  constructor(
    @InjectRepository(CampaignResourceDefinition)
    private readonly definitions: Repository<CampaignResourceDefinition>,
    @InjectRepository(CharacterResourceState)
    private readonly states: Repository<CharacterResourceState>,
    @InjectRepository(CharacterFormResourceOverride)
    private readonly overrides: Repository<CharacterFormResourceOverride>,
  ) {}

  // ── definitions ──
  createDefinition(
    data: Partial<CampaignResourceDefinition>,
  ): CampaignResourceDefinition {
    return this.definitions.create(data as DeepPartial<CampaignResourceDefinition>);
  }
  saveDefinition(
    def: CampaignResourceDefinition,
  ): Promise<CampaignResourceDefinition> {
    return this.definitions.save(def);
  }
  async removeDefinition(def: CampaignResourceDefinition): Promise<void> {
    await this.definitions.remove(def);
  }
  findDefinitionById(id: string): Promise<CampaignResourceDefinition | null> {
    return this.definitions.findOne({ where: { id } });
  }
  findDefinitionsByCampaign(
    campaignId: string,
  ): Promise<CampaignResourceDefinition[]> {
    return this.definitions.find({
      where: { campaignId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }
  findDefinitionByNameInCampaign(
    campaignId: string,
    name: string,
  ): Promise<CampaignResourceDefinition | null> {
    return this.definitions
      .createQueryBuilder('res')
      .where('res.campaign_id = :campaignId', { campaignId })
      .andWhere('LOWER(res.name) = LOWER(:name)', { name })
      .getOne();
  }
  async maxDisplayOrder(campaignId: string): Promise<number | null> {
    const row = await this.definitions
      .createQueryBuilder('res')
      .select('MAX(res.display_order)', 'max')
      .where('res.campaign_id = :campaignId', { campaignId })
      .getRawOne<{ max: string | null }>();
    return row?.max != null ? Number(row.max) : null;
  }

  // ── character states ──
  createState(data: Partial<CharacterResourceState>): CharacterResourceState {
    return this.states.create(data as DeepPartial<CharacterResourceState>);
  }
  saveState(state: CharacterResourceState): Promise<CharacterResourceState> {
    return this.states.save(state);
  }
  saveStates(
    states: CharacterResourceState[],
  ): Promise<CharacterResourceState[]> {
    return this.states.save(states);
  }
  findStatesByCharacter(characterId: string): Promise<CharacterResourceState[]> {
    return this.states.find({ where: { characterId } });
  }
  findStateByCharacterAndDefinition(
    characterId: string,
    resourceDefinitionId: string,
  ): Promise<CharacterResourceState | null> {
    return this.states.findOne({
      where: { characterId, resourceDefinitionId },
    });
  }
  async deleteStatesByDefinition(resourceDefinitionId: string): Promise<void> {
    await this.states.delete({ resourceDefinitionId });
  }

  // ── form overrides ──
  findOverridesByForm(formId: string): Promise<CharacterFormResourceOverride[]> {
    return this.overrides.find({ where: { characterFormId: formId } });
  }
  async replaceOverridesForForm(
    formId: string,
    campaignId: string,
    overrides: FormResourceOverrideInput[],
  ): Promise<CharacterFormResourceOverride[]> {
    await this.overrides.delete({ characterFormId: formId });
    if (overrides.length === 0) return [];
    const rows = overrides.map((o) =>
      this.overrides.create({
        characterFormId: formId,
        campaignId,
        resourceDefinitionId: o.resourceDefinitionId,
        maxValue: o.maxValue,
      }),
    );
    return this.overrides.save(rows);
  }
  async deleteOverridesByDefinition(
    resourceDefinitionId: string,
  ): Promise<void> {
    await this.overrides.delete({ resourceDefinitionId });
  }
}
