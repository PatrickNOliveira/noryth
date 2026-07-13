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
import { CharacterResourceService } from '../services/character-resource.service';
import { CharacterResourceDto } from '../dto/character-resource.dto';
import { UpdateCharacterResourcesDto } from '../dto/update-character-resources.dto';

/**
 * A character's resources (base + effective). Read honors player visibility;
 * writing the values is master-only (enforced in the service).
 */
@Controller('campaigns/:campaignId/characters/:characterId/resources')
export class CharacterResourcesController {
  constructor(private readonly resources: CharacterResourceService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
  ): Promise<CharacterResourceDto[]> {
    return this.resources.list(user.id, campaignId, characterId);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: UpdateCharacterResourcesDto,
  ): Promise<CharacterResourceDto[]> {
    return this.resources.update(user.id, campaignId, characterId, dto);
  }
}
