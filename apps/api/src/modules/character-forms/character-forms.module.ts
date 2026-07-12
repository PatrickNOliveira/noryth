import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { CharactersModule } from '@modules/characters/characters.module';
import { FactionsModule } from '@modules/factions/factions.module';
import { CampaignAttributesModule } from '@modules/campaign-attributes/campaign-attributes.module';
import { AbilitiesModule } from '@modules/abilities/abilities.module';
import { CharacterForm } from './entities/character-form.entity';
import { CharacterFormAttributeValue } from './entities/character-form-attribute-value.entity';
import { CharacterFormAbility } from './entities/character-form-ability.entity';
import { CharacterFormSessionSprite } from './entities/character-form-session-sprite.entity';
import { CharacterFormsController } from './controllers/character-forms.controller';
import { CharacterFormService } from './services/character-form.service';
import { CharacterFormImageService } from './services/character-form-image.service';
import { CharacterFormImageAgent } from './services/character-form-image.agent';
import { CharacterFormImageHandler } from './services/character-form-image.handler';
import { CharacterFormSessionSpriteService } from './services/character-form-session-sprite.service';
import { CharacterFormSessionSpriteAgent } from './services/character-form-session-sprite.agent';
import { CharacterFormSessionSpriteHandler } from './services/character-form-session-sprite.handler';
import { CHARACTER_FORMS_REPOSITORY } from './repositories/character-forms.repository';
import { TypeOrmCharacterFormsRepository } from './repositories/typeorm-character-forms.repository';

/**
 * Character forms — alternative visual/mechanical variations of the SAME
 * character, for campaign preparation (never session). Reuses CampaignsService
 * (master permission), CharactersService (base character), FactionsService and
 * CampaignAttributesService (validation) and AbilitiesService (ability lookup).
 * Form image rides the shared AI image queue + image/storage/realtime PORTS.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CharacterForm,
      CharacterFormAttributeValue,
      CharacterFormAbility,
      CharacterFormSessionSprite,
    ]),
    CampaignsModule,
    CharactersModule,
    FactionsModule,
    CampaignAttributesModule,
    AbilitiesModule,
  ],
  controllers: [CharacterFormsController],
  providers: [
    CharacterFormService,
    CharacterFormImageService,
    CharacterFormImageAgent,
    CharacterFormImageHandler,
    CharacterFormSessionSpriteService,
    CharacterFormSessionSpriteAgent,
    CharacterFormSessionSpriteHandler,
    { provide: CHARACTER_FORMS_REPOSITORY, useClass: TypeOrmCharacterFormsRepository },
  ],
  exports: [CharacterFormService, CharacterFormSessionSpriteService],
})
export class CharacterFormsModule {}
