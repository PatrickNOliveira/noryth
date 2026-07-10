import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { FactionsModule } from '@modules/factions/factions.module';
import { CampaignAttributesModule } from '@modules/campaign-attributes/campaign-attributes.module';
import { Character } from './entities/character.entity';
import { CharacterAttributeValue } from './entities/character-attribute-value.entity';
import { CharactersController } from './controllers/characters.controller';
import { PlayerCharactersController } from './controllers/player-characters.controller';
import { CharactersService } from './services/characters.service';
import { CharacterPortraitAgent } from './services/character-portrait.agent';
import { CharacterPortraitHandler } from './services/character-portrait.handler';
import { CHARACTERS_REPOSITORY } from './repositories/characters.repository';
import { TypeOrmCharactersRepository } from './repositories/typeorm-characters.repository';

/**
 * Characters module. Reuses CampaignsService (master permission + campaign
 * context), FactionsService (validate/enrich faction links) and
 * CampaignAttributesService (validate attribute values). Portrait generation
 * rides the shared AI image queue and realtime/storage/image PORTS — no
 * infrastructure leaks into domain code.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Character, CharacterAttributeValue]),
    CampaignsModule,
    FactionsModule,
    CampaignAttributesModule,
  ],
  controllers: [CharactersController, PlayerCharactersController],
  providers: [
    CharactersService,
    CharacterPortraitAgent,
    CharacterPortraitHandler,
    { provide: CHARACTERS_REPOSITORY, useClass: TypeOrmCharactersRepository },
  ],
})
export class CharactersModule {}
