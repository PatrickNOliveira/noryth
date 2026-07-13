import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { CharactersModule } from '@modules/characters/characters.module';
import { CharacterFormsModule } from '@modules/character-forms/character-forms.module';
import { CampaignResourceDefinition } from './entities/campaign-resource-definition.entity';
import { CharacterResourceState } from './entities/character-resource-state.entity';
import { CharacterFormResourceOverride } from './entities/character-form-resource-override.entity';
import { CampaignResourcesController } from './controllers/campaign-resources.controller';
import { CharacterResourcesController } from './controllers/character-resources.controller';
import { CharacterFormResourcesController } from './controllers/character-form-resources.controller';
import { CampaignResourceService } from './services/campaign-resource.service';
import { CharacterResourceService } from './services/character-resource.service';
import { CharacterFormResourceService } from './services/character-form-resource.service';
import { CAMPAIGN_RESOURCES_REPOSITORY } from './repositories/campaign-resources.repository';
import { TypeOrmCampaignResourcesRepository } from './repositories/typeorm-campaign-resources.repository';

/**
 * Campaign resources module — resource definitions, per-character states and
 * per-form max overrides. Reuses CampaignsService (permission), CharactersService
 * (character lookup + fan-out) and CharacterFormService (active form / form
 * ownership). Persistence sits behind the repository PORT; no infra coupling.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignResourceDefinition,
      CharacterResourceState,
      CharacterFormResourceOverride,
    ]),
    CampaignsModule,
    CharactersModule,
    CharacterFormsModule,
  ],
  controllers: [
    CampaignResourcesController,
    CharacterResourcesController,
    CharacterFormResourcesController,
  ],
  providers: [
    CampaignResourceService,
    CharacterResourceService,
    CharacterFormResourceService,
    {
      provide: CAMPAIGN_RESOURCES_REPOSITORY,
      useClass: TypeOrmCampaignResourcesRepository,
    },
  ],
  exports: [CampaignResourceService, CharacterResourceService],
})
export class CampaignResourcesModule {}
