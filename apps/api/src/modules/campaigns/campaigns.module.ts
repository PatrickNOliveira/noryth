import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables } from '@shared/config/env.validation';
import { UsersModule } from '@modules/users/users.module';
import { Campaign } from './entities/campaign.entity';
import { CampaignParticipant } from './entities/campaign-participant.entity';
import { CampaignsController } from './controllers/campaigns.controller';
import { CampaignParticipantsController } from './controllers/campaign-participants.controller';
import { CampaignsService } from './services/campaigns.service';
import { CampaignParticipantsService } from './services/campaign-participants.service';
import { CampaignPresenceService } from './services/campaign-presence.service';
import { CampaignPresenceGateway } from './gateways/campaign-presence.gateway';
import { CAMPAIGNS_REPOSITORY } from './repositories/campaigns.repository';
import { TypeOrmCampaignRepository } from './repositories/typeorm-campaign.repository';
import { CAMPAIGN_PARTICIPANTS_REPOSITORY } from './repositories/campaign-participants.repository';
import { TypeOrmCampaignParticipantsRepository } from './repositories/typeorm-campaign-participants.repository';

/**
 * Campaigns module — campaigns and their membership/presence.
 *
 * Depends on the abstract STORAGE_PROVIDER (covers) and PRESENCE_PROVIDER
 * (online presence), both bound globally in ProvidersModule. The presence
 * gateway is the only Socket.IO-aware piece; domain services stay transport-free.
 * JwtModule is registered locally so the gateway can authenticate sockets.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignParticipant]),
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
  ],
  controllers: [CampaignsController, CampaignParticipantsController],
  providers: [
    CampaignsService,
    CampaignParticipantsService,
    CampaignPresenceService,
    CampaignPresenceGateway,
    { provide: CAMPAIGNS_REPOSITORY, useClass: TypeOrmCampaignRepository },
    {
      provide: CAMPAIGN_PARTICIPANTS_REPOSITORY,
      useClass: TypeOrmCampaignParticipantsRepository,
    },
  ],
  exports: [CampaignsService, CampaignParticipantsService],
})
export class CampaignsModule {}
