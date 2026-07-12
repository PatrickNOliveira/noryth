import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { CharactersModule } from '@modules/characters/characters.module';
import { FactionsModule } from '@modules/factions/factions.module';
import { AbilityDefinition } from './entities/ability-definition.entity';
import { CharacterAbility } from './entities/character-ability.entity';
import { AbilitiesController } from './controllers/abilities.controller';
import { AbilityProposalsController } from './controllers/ability-proposals.controller';
import { CharacterAbilitiesController } from './controllers/character-abilities.controller';
import { AbilitiesService } from './services/abilities.service';
import { ABILITIES_REPOSITORY } from './repositories/abilities.repository';
import { TypeOrmAbilitiesRepository } from './repositories/typeorm-abilities.repository';

/**
 * Abilities module — ability definitions, the approval workflow and character
 * ability links. Reuses CampaignsService (permission), CharactersService
 * (control/validation) and FactionsService (optional faction link). Realtime is
 * via the REALTIME_PROVIDER port only. No image/queue infrastructure here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AbilityDefinition, CharacterAbility]),
    CampaignsModule,
    CharactersModule,
    FactionsModule,
  ],
  controllers: [
    AbilitiesController,
    AbilityProposalsController,
    CharacterAbilitiesController,
  ],
  providers: [
    AbilitiesService,
    { provide: ABILITIES_REPOSITORY, useClass: TypeOrmAbilitiesRepository },
  ],
  exports: [AbilitiesService],
})
export class AbilitiesModule {}
