import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { CharacterFormResourceService } from '../services/character-form-resource.service';
import {
  FormResourceOverrideDto,
  UpdateFormResourcesDto,
} from '../dto/update-form-resources.dto';

/** A form's resource max overrides. Master-only (enforced in the service). */
@Controller('campaigns/:campaignId/characters/:characterId/forms/:formId/resources')
export class CharacterFormResourcesController {
  constructor(private readonly resources: CharacterFormResourceService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
  ): Promise<FormResourceOverrideDto[]> {
    return this.resources.list(user.id, campaignId, characterId, formId);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
    @Body() dto: UpdateFormResourcesDto,
  ): Promise<FormResourceOverrideDto[]> {
    return this.resources.update(user.id, campaignId, characterId, formId, dto);
  }
}
