import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { CampaignMap } from './entities/campaign-map.entity';
import { MapPoint } from './entities/map-point.entity';
import { MapsController } from './controllers/maps.controller';
import { MapPointsController } from './controllers/map-points.controller';
import { MapsService } from './services/maps.service';
import { MapPointsService } from './services/map-points.service';
import { MapImageAgent } from './services/map-image.agent';
import { MapImageHandler } from './services/map-image.handler';
import { MapSessionSceneAgent } from './services/map-session-scene.agent';
import { MapSessionSceneHandler } from './services/map-session-scene.handler';
import { MAPS_REPOSITORY } from './repositories/maps.repository';
import { TypeOrmMapsRepository } from './repositories/typeorm-maps.repository';

/**
 * Maps module — campaign maps, hierarchy, points of interest and async map
 * images. Reuses CampaignsService (master permission + campaign context/art
 * direction). Image generation rides the shared AI image queue and the
 * realtime/storage/image PORTS; no infrastructure leaks into domain code.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignMap, MapPoint]),
    CampaignsModule,
  ],
  controllers: [MapsController, MapPointsController],
  providers: [
    MapsService,
    MapPointsService,
    MapImageAgent,
    MapImageHandler,
    MapSessionSceneAgent,
    MapSessionSceneHandler,
    { provide: MAPS_REPOSITORY, useClass: TypeOrmMapsRepository },
  ],
  exports: [MapsService],
})
export class MapsModule {}
