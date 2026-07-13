import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CampaignResourceDefinition } from '../entities/campaign-resource-definition.entity';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import {
  CAMPAIGN_RESOURCES_REPOSITORY,
  CampaignResourcesRepository,
} from '../repositories/campaign-resources.repository';
import { CharacterResourceService } from './character-resource.service';

/**
 * Application service for per-campaign resource DEFINITIONS. Master-only writes;
 * reads open to any participant. On create, seeds a default state on every
 * existing character; on remove, cascades away the character states and form
 * overrides that reference it (the project uses no DB foreign keys).
 */
@Injectable()
export class CampaignResourceService {
  constructor(
    @Inject(CAMPAIGN_RESOURCES_REPOSITORY)
    private readonly repo: CampaignResourcesRepository,
    private readonly campaigns: CampaignsService,
    private readonly characterResources: CharacterResourceService,
  ) {}

  async list(
    userId: string,
    campaignId: string,
  ): Promise<CampaignResourceDefinition[]> {
    await this.campaigns.findForMemberOrFail(userId, campaignId);
    return this.repo.findDefinitionsByCampaign(campaignId);
  }

  async create(
    userId: string,
    campaignId: string,
    dto: CreateResourceDto,
  ): Promise<CampaignResourceDefinition> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);

    const name = dto.name.trim();
    await this.assertNameAvailable(campaignId, name);
    const minValue = dto.minValue ?? 0;
    this.assertRange(minValue, dto.defaultMaxValue);
    const strategy = dto.defaultCurrentValueStrategy ?? 'MAX';
    const defaultCurrentValue =
      strategy === 'CUSTOM' ? dto.defaultCurrentValue ?? dto.defaultMaxValue : null;

    const displayOrder =
      dto.displayOrder ?? (await this.nextDisplayOrder(campaignId));

    const def = await this.repo.saveDefinition(
      this.repo.createDefinition({
        campaignId,
        name,
        description: dto.description?.trim() ?? '',
        type: dto.type ?? 'POOL',
        minValue,
        defaultMaxValue: dto.defaultMaxValue,
        defaultCurrentValueStrategy: strategy,
        defaultCurrentValue,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        displayOrder,
      }),
    );

    // Seed a state on every existing character so none is left without it.
    await this.characterResources.seedForDefinition(def);
    return def;
  }

  async update(
    userId: string,
    campaignId: string,
    resourceId: string,
    dto: UpdateResourceDto,
  ): Promise<CampaignResourceDefinition> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.getOwned(campaignId, resourceId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      await this.assertNameAvailable(campaignId, name, def.id);
      def.name = name;
    }
    if (dto.description !== undefined) def.description = dto.description.trim();
    if (dto.type !== undefined) def.type = dto.type;
    if (dto.isVisibleToPlayers !== undefined) {
      def.isVisibleToPlayers = dto.isVisibleToPlayers;
    }
    if (dto.displayOrder !== undefined) def.displayOrder = dto.displayOrder;
    if (dto.defaultCurrentValueStrategy !== undefined) {
      def.defaultCurrentValueStrategy = dto.defaultCurrentValueStrategy;
    }
    if (dto.defaultCurrentValue !== undefined) {
      def.defaultCurrentValue = dto.defaultCurrentValue;
    }

    // Validate the merged min/max so a partial update never yields min > max.
    const minValue = dto.minValue ?? def.minValue;
    const defaultMaxValue = dto.defaultMaxValue ?? def.defaultMaxValue;
    this.assertRange(minValue, defaultMaxValue);
    def.minValue = minValue;
    def.defaultMaxValue = defaultMaxValue;

    return this.repo.saveDefinition(def);
  }

  async remove(
    userId: string,
    campaignId: string,
    resourceId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.getOwned(campaignId, resourceId);
    // Cascade: drop the resource from every character and form first.
    await this.repo.deleteStatesByDefinition(def.id);
    await this.repo.deleteOverridesByDefinition(def.id);
    await this.repo.removeDefinition(def);
  }

  // ── invariants ──────────────────────────────────────────────

  private assertRange(minValue: number, maxValue: number): void {
    if (minValue > maxValue) {
      throw new BadRequestException(
        'O valor mínimo não pode ser maior que o valor máximo padrão.',
      );
    }
  }

  private async assertNameAvailable(
    campaignId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.repo.findDefinitionByNameInCampaign(campaignId, name);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Já existe um recurso com este nome nesta mesa.');
    }
  }

  private async getOwned(
    campaignId: string,
    resourceId: string,
  ): Promise<CampaignResourceDefinition> {
    const def = await this.repo.findDefinitionById(resourceId);
    if (!def || def.campaignId !== campaignId) {
      throw new NotFoundException('Recurso não encontrado.');
    }
    return def;
  }

  private async nextDisplayOrder(campaignId: string): Promise<number> {
    const max = await this.repo.maxDisplayOrder(campaignId);
    return max == null ? 0 : max + 1;
  }
}
