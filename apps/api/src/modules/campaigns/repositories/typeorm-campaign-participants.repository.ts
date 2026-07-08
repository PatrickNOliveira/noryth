import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CampaignParticipant } from '../entities/campaign-participant.entity';
import { CampaignParticipantsRepository } from './campaign-participants.repository';

/** TypeORM adapter for {@link CampaignParticipantsRepository}. */
@Injectable()
export class TypeOrmCampaignParticipantsRepository
  implements CampaignParticipantsRepository
{
  constructor(
    @InjectRepository(CampaignParticipant)
    private readonly repo: Repository<CampaignParticipant>,
  ) {}

  createEntity(data: Partial<CampaignParticipant>): CampaignParticipant {
    return this.repo.create(data as DeepPartial<CampaignParticipant>);
  }

  save(participant: CampaignParticipant): Promise<CampaignParticipant> {
    return this.repo.save(participant);
  }

  async remove(participant: CampaignParticipant): Promise<void> {
    await this.repo.remove(participant);
  }

  findByCampaign(campaignId: string): Promise<CampaignParticipant[]> {
    return this.repo.find({
      where: { campaignId },
      order: { joinedAt: 'ASC' },
    });
  }

  findOne(
    campaignId: string,
    userId: string,
  ): Promise<CampaignParticipant | null> {
    return this.repo.findOne({ where: { campaignId, userId } });
  }

  async exists(campaignId: string, userId: string): Promise<boolean> {
    return (await this.repo.countBy({ campaignId, userId })) > 0;
  }

  countByCampaign(campaignId: string): Promise<number> {
    return this.repo.countBy({ campaignId });
  }
}
