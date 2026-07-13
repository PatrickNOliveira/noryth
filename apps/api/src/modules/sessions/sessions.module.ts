import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { MapsModule } from '@modules/maps/maps.module';
import { CharactersModule } from '@modules/characters/characters.module';
import { FactionsModule } from '@modules/factions/factions.module';
import { CampaignAttributesModule } from '@modules/campaign-attributes/campaign-attributes.module';
import { ItemsModule } from '@modules/items/items.module';
import { AbilitiesModule } from '@modules/abilities/abilities.module';
import { CharacterFormsModule } from '@modules/character-forms/character-forms.module';
import { CampaignResourcesModule } from '@modules/campaign-resources/campaign-resources.module';
import { CampaignSession } from './entities/campaign-session.entity';
import { SessionCharacter } from './entities/session-character.entity';
import { CharacterSessionSprite } from './entities/character-session-sprite.entity';
import { SessionsController } from './controllers/sessions.controller';
import { SessionCharactersController } from './controllers/session-characters.controller';
import { SessionImprovisedCharactersController } from './controllers/session-improvised-characters.controller';
import { SessionImprovisedItemsController } from './controllers/session-improvised-items.controller';
import { SessionImprovisedAbilitiesController } from './controllers/session-improvised-abilities.controller';
import { CharacterSessionSpritesController } from './controllers/character-session-sprites.controller';
import { SessionCharacterResourcesController } from './controllers/session-character-resources.controller';
import { SessionsService } from './services/sessions.service';
import { SessionCharacterService } from './services/session-character.service';
import { SessionCharacterResourceService } from './services/session-character-resource.service';
import { SessionImprovisedCharacterService } from './services/session-improvised-character.service';
import { ImprovisedCharacterAgent } from './services/improvised-character.agent';
import { SessionImprovisedItemService } from './services/session-improvised-item.service';
import { ImprovisedItemAgent } from './services/improvised-item.agent';
import { SessionImprovisedAbilityService } from './services/session-improvised-ability.service';
import { ImprovisedAbilityAgent } from './services/improvised-ability.agent';
import { CharacterSessionSpriteService } from './services/character-session-sprite.service';
import { CharacterSessionSpriteAgent } from './services/character-session-sprite.agent';
import { CharacterSessionSpriteHandler } from './services/character-session-sprite.handler';
import { SESSIONS_REPOSITORY } from './repositories/sessions.repository';
import { TypeOrmSessionsRepository } from './repositories/typeorm-sessions.repository';
import { SESSION_CHARACTERS_REPOSITORY } from './repositories/session-characters.repository';
import { TypeOrmSessionCharactersRepository } from './repositories/typeorm-session-characters.repository';

/**
 * Sessions module — the live session, plus characters placed on the session map
 * and their 2.5D session sprites. Reuses CampaignsService (permission),
 * MapsService (map lookup), CharactersService (character lookup) and
 * FactionsService (sprite enrichment). Sprite generation rides the shared AI
 * image queue and the image/storage/realtime PORTS; no infrastructure leaks in.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignSession,
      SessionCharacter,
      CharacterSessionSprite,
    ]),
    CampaignsModule,
    MapsModule,
    CharactersModule,
    FactionsModule,
    CampaignAttributesModule,
    ItemsModule,
    AbilitiesModule,
    CharacterFormsModule,
    CampaignResourcesModule,
  ],
  controllers: [
    SessionsController,
    SessionCharactersController,
    SessionImprovisedCharactersController,
    SessionImprovisedItemsController,
    SessionImprovisedAbilitiesController,
    CharacterSessionSpritesController,
    SessionCharacterResourcesController,
  ],
  providers: [
    SessionsService,
    SessionCharacterService,
    SessionCharacterResourceService,
    SessionImprovisedCharacterService,
    ImprovisedCharacterAgent,
    SessionImprovisedItemService,
    ImprovisedItemAgent,
    SessionImprovisedAbilityService,
    ImprovisedAbilityAgent,
    CharacterSessionSpriteService,
    CharacterSessionSpriteAgent,
    CharacterSessionSpriteHandler,
    { provide: SESSIONS_REPOSITORY, useClass: TypeOrmSessionsRepository },
    {
      provide: SESSION_CHARACTERS_REPOSITORY,
      useClass: TypeOrmSessionCharactersRepository,
    },
  ],
})
export class SessionsModule {}
