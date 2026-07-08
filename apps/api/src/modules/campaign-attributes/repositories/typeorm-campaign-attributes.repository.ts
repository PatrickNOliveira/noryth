import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CampaignAttribute } from '../entities/campaign-attribute.entity';
import { CampaignAttributesRepository } from './campaign-attributes.repository';

/** TypeORM adapter for {@link CampaignAttributesRepository}. */
@Injectable()
export class TypeOrmCampaignAttributesRepository
  implements CampaignAttributesRepository
{
  constructor(
    @InjectRepository(CampaignAttribute)
    private readonly repo: Repository<CampaignAttribute>,
  ) {}

  createEntity(data: Partial<CampaignAttribute>): CampaignAttribute {
    return this.repo.create(data as DeepPartial<CampaignAttribute>);
  }

  save(attribute: CampaignAttribute): Promise<CampaignAttribute> {
    return this.repo.save(attribute);
  }

  async remove(attribute: CampaignAttribute): Promise<void> {
    await this.repo.remove(attribute);
  }

  findById(id: string): Promise<CampaignAttribute | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCampaign(campaignId: string): Promise<CampaignAttribute[]> {
    return this.repo.find({
      where: { campaignId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  findByNameInCampaign(
    campaignId: string,
    name: string,
  ): Promise<CampaignAttribute | null> {
    return this.repo
      .createQueryBuilder('attr')
      .where('attr.campaign_id = :campaignId', { campaignId })
      .andWhere('LOWER(attr.name) = LOWER(:name)', { name })
      .getOne();
  }

  async maxDisplayOrder(campaignId: string): Promise<number | null> {
    const row = await this.repo
      .createQueryBuilder('attr')
      .select('MAX(attr.display_order)', 'max')
      .where('attr.campaign_id = :campaignId', { campaignId })
      .getRawOne<{ max: string | null }>();
    return row?.max != null ? Number(row.max) : null;
  }

  isReferencedByCharacters(_attributeId: string): Promise<boolean> {
    // No character attribute-values table exists yet, so nothing references an
    // attribute. When characters are implemented, count usages here and return
    // true when > 0 — CampaignAttributesService already blocks removal on true.
    return Promise.resolve(false);
  }
}
