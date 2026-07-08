import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Not, Repository } from 'typeorm';
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

  findByParticipant(userId: string): Promise<Campaign[]> {
    return this.repo
      .createQueryBuilder('campaign')
      .innerJoin(
        'campaign_participants',
        'cp',
        'cp.campaign_id = campaign.id AND cp.user_id = :userId',
        { userId },
      )
      .orderBy('campaign.created_at', 'DESC')
      .getMany();
  }

  findPublic(): Promise<Campaign[]> {
    return this.repo.find({
      where: { visibility: 'public', status: Not('archived') },
      order: { createdAt: 'DESC' },
    });
  }
}
