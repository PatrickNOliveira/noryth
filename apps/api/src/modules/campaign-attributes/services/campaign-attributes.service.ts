import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CampaignAttribute } from '../entities/campaign-attribute.entity';
import { CreateCampaignAttributeDto } from '../dto/create-campaign-attribute.dto';
import { UpdateCampaignAttributeDto } from '../dto/update-campaign-attribute.dto';
import {
  CAMPAIGN_ATTRIBUTES_REPOSITORY,
  CampaignAttributesRepository,
} from '../repositories/campaign-attributes.repository';

/**
 * Application service for per-campaign character attributes.
 *
 * Owns the invariants: only the campaign owner/master manages attributes,
 * names are unique per campaign (case-insensitively), minValue <= maxValue,
 * and a missing displayOrder appends to the end. Ownership is delegated to
 * {@link CampaignsService.findOwnedOrFail}, which throws Not Found / Forbidden.
 */
@Injectable()
export class CampaignAttributesService {
  constructor(
    @Inject(CAMPAIGN_ATTRIBUTES_REPOSITORY)
    private readonly repository: CampaignAttributesRepository,
    private readonly campaigns: CampaignsService,
  ) {}

  async list(userId: string, campaignId: string): Promise<CampaignAttribute[]> {
    await this.campaigns.findOwnedOrFail(userId, campaignId);
    return this.repository.findByCampaign(campaignId);
  }

  async create(
    userId: string,
    campaignId: string,
    dto: CreateCampaignAttributeDto,
  ): Promise<CampaignAttribute> {
    await this.campaigns.findOwnedOrFail(userId, campaignId);

    const name = dto.name.trim();
    this.assertRange(dto.minValue, dto.maxValue);
    await this.assertNameAvailable(campaignId, name);

    const displayOrder =
      dto.displayOrder ?? (await this.nextDisplayOrder(campaignId));

    const attribute = this.repository.createEntity({
      campaignId,
      name,
      minValue: dto.minValue,
      maxValue: dto.maxValue,
      displayOrder,
    });
    return this.repository.save(attribute);
  }

  async update(
    userId: string,
    campaignId: string,
    attributeId: string,
    dto: UpdateCampaignAttributeDto,
  ): Promise<CampaignAttribute> {
    await this.campaigns.findOwnedOrFail(userId, campaignId);
    const attribute = await this.getOwnedAttribute(campaignId, attributeId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      await this.assertNameAvailable(campaignId, name, attribute.id);
      attribute.name = name;
    }

    // Validate the merged range so a partial update never yields min > max.
    const minValue = dto.minValue ?? attribute.minValue;
    const maxValue = dto.maxValue ?? attribute.maxValue;
    this.assertRange(minValue, maxValue);
    attribute.minValue = minValue;
    attribute.maxValue = maxValue;

    if (dto.displayOrder !== undefined) {
      attribute.displayOrder = dto.displayOrder;
    }

    return this.repository.save(attribute);
  }

  async remove(
    userId: string,
    campaignId: string,
    attributeId: string,
  ): Promise<void> {
    await this.campaigns.findOwnedOrFail(userId, campaignId);
    const attribute = await this.getOwnedAttribute(campaignId, attributeId);

    if (await this.repository.isReferencedByCharacters(attribute.id)) {
      throw new ConflictException(
        'Este atributo já está sendo usado por personagens desta mesa.',
      );
    }

    await this.repository.remove(attribute);
  }

  // ── invariants ──────────────────────────────────────────────

  private assertRange(minValue: number, maxValue: number): void {
    if (minValue > maxValue) {
      throw new BadRequestException(
        'O valor mínimo não pode ser maior que o valor máximo.',
      );
    }
  }

  private async assertNameAvailable(
    campaignId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.repository.findByNameInCampaign(campaignId, name);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(
        'Já existe um atributo com este nome nesta mesa.',
      );
    }
  }

  private async getOwnedAttribute(
    campaignId: string,
    attributeId: string,
  ): Promise<CampaignAttribute> {
    const attribute = await this.repository.findById(attributeId);
    if (!attribute || attribute.campaignId !== campaignId) {
      throw new NotFoundException('Atributo não encontrado.');
    }
    return attribute;
  }

  private async nextDisplayOrder(campaignId: string): Promise<number> {
    const max = await this.repository.maxDisplayOrder(campaignId);
    return max == null ? 0 : max + 1;
  }
}
