import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { CampaignAttribute } from './entities/campaign-attribute.entity';
import { CampaignAttributesController } from './controllers/campaign-attributes.controller';
import { CampaignAttributesService } from './services/campaign-attributes.service';
import { CAMPAIGN_ATTRIBUTES_REPOSITORY } from './repositories/campaign-attributes.repository';
import { TypeOrmCampaignAttributesRepository } from './repositories/typeorm-campaign-attributes.repository';

/**
 * Campaign attributes module. Reuses CampaignsService for ownership checks and
 * stays free of infrastructure — persistence sits behind the repository PORT.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CampaignAttribute]), CampaignsModule],
  controllers: [CampaignAttributesController],
  providers: [
    CampaignAttributesService,
    {
      provide: CAMPAIGN_ATTRIBUTES_REPOSITORY,
      useClass: TypeOrmCampaignAttributesRepository,
    },
  ],
  exports: [CampaignAttributesService],
})
export class CampaignAttributesModule {}
