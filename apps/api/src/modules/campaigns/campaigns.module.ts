import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignsController } from './controllers/campaigns.controller';
import { CampaignsService } from './services/campaigns.service';
import { CAMPAIGNS_REPOSITORY } from './repositories/campaigns.repository';
import { TypeOrmCampaignRepository } from './repositories/typeorm-campaign.repository';

/**
 * Campaigns module — the first real domain feature. Depends on the abstract
 * STORAGE_PROVIDER (bound globally in ProvidersModule) for cover uploads; it
 * never references MinIO.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Campaign])],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    { provide: CAMPAIGNS_REPOSITORY, useClass: TypeOrmCampaignRepository },
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
