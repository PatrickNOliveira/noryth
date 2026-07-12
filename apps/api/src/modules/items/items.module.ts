import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { CharactersModule } from '@modules/characters/characters.module';
import { MapsModule } from '@modules/maps/maps.module';
import { ItemDefinition } from './entities/item-definition.entity';
import { ItemInstance } from './entities/item-instance.entity';
import { ItemsController } from './controllers/items.controller';
import { ItemInstancesController } from './controllers/item-instances.controller';
import { ItemDefinitionsService } from './services/item-definitions.service';
import { ItemInstancesService } from './services/item-instances.service';
import { ItemImageAgent } from './services/item-image.agent';
import { ItemImageHandler } from './services/item-image.handler';
import { ITEMS_REPOSITORY } from './repositories/items.repository';
import { TypeOrmItemsRepository } from './repositories/typeorm-items.repository';

/**
 * Items module — item definitions, instances and async item images. Reuses
 * CampaignsService (permission + art direction), CharactersService and
 * MapsService (validate instance location). Image generation rides the shared
 * AI image queue and realtime/storage/image PORTS.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ItemDefinition, ItemInstance]),
    CampaignsModule,
    CharactersModule,
    MapsModule,
  ],
  controllers: [ItemsController, ItemInstancesController],
  providers: [
    ItemDefinitionsService,
    ItemInstancesService,
    ItemImageAgent,
    ItemImageHandler,
    { provide: ITEMS_REPOSITORY, useClass: TypeOrmItemsRepository },
  ],
  exports: [ItemDefinitionsService, ItemInstancesService],
})
export class ItemsModule {}
