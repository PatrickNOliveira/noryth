import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { Faction } from './entities/faction.entity';
import { FactionImage } from './entities/faction-image.entity';
import { FactionsController } from './controllers/factions.controller';
import { FactionsService } from './services/factions.service';
import { FactionSymbolAgent } from './services/faction-symbol.agent';
import { FactionSymbolHandler } from './services/faction-symbol.handler';
import { FACTIONS_REPOSITORY } from './repositories/factions.repository';
import { TypeOrmFactionsRepository } from './repositories/typeorm-factions.repository';

/**
 * Factions module. Depends on the abstract STORAGE_PROVIDER and
 * IMAGE_GENERATION_PROVIDER (bound in ProvidersModule) — never on MinIO/OpenAI.
 * Reuses CampaignsService for ownership checks + campaign context.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Faction, FactionImage]), CampaignsModule],
  controllers: [FactionsController],
  providers: [
    FactionsService,
    FactionSymbolAgent,
    FactionSymbolHandler,
    { provide: FACTIONS_REPOSITORY, useClass: TypeOrmFactionsRepository },
  ],
  exports: [FactionsService],
})
export class FactionsModule {}
