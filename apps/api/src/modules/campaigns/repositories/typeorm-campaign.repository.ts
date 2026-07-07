import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Campaign } from '../entities/campaign.entity';
import { CampaignsRepository } from './campaigns.repository';

/** TypeORM adapter for {@link CampaignsRepository}. */
@Injectable()
export class TypeOrmCampaignRepository implements CampaignsRepository {
  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
  ) {}

  createEntity(data: Partial<Campaign>): Campaign {
    return this.repo.create(data as DeepPartial<Campaign>);
  }

  save(campaign: Campaign): Promise<Campaign> {
    return this.repo.save(campaign);
  }

  findById(id: string): Promise<Campaign | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByOwner(ownerId: string): Promise<Campaign[]> {
    return this.repo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }
}
