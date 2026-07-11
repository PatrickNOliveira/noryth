import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CampaignSession } from '../entities/campaign-session.entity';
import { SessionsRepository } from './sessions.repository';

/** TypeORM adapter for {@link SessionsRepository}. */
@Injectable()
export class TypeOrmSessionsRepository implements SessionsRepository {
  constructor(
    @InjectRepository(CampaignSession)
    private readonly sessions: Repository<CampaignSession>,
  ) {}

  create(data: Partial<CampaignSession>): CampaignSession {
    return this.sessions.create(data as DeepPartial<CampaignSession>);
  }

  save(session: CampaignSession): Promise<CampaignSession> {
    return this.sessions.save(session);
  }

  findById(id: string): Promise<CampaignSession | null> {
    return this.sessions.findOne({ where: { id } });
  }

  findActiveByCampaign(campaignId: string): Promise<CampaignSession | null> {
    return this.sessions.findOne({
      where: { campaignId, status: 'ACTIVE' },
      order: { startedAt: 'DESC' },
    });
  }
}
