import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { AbilitiesService } from '../services/abilities.service';
import { CharacterAbilityDto } from '../dto/ability.dto';
import { AssignAbilityDto } from '../dto/assign-ability.dto';

/** A character's abilities. Read honors visibility; assign/remove are master-only. */
@Controller('campaigns/:campaignId/characters/:characterId/abilities')
export class CharacterAbilitiesController {
  constructor(private readonly abilities: AbilitiesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
  ): Promise<CharacterAbilityDto[]> {
    return this.abilities.listCharacterAbilities(user.id, campaignId, characterId);
  }

  @Post()
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: AssignAbilityDto,
  ): Promise<CharacterAbilityDto> {
    return this.abilities.assign(user.id, campaignId, characterId, dto);
  }

  @Delete(':characterAbilityId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('characterAbilityId', new ParseUUIDPipe()) characterAbilityId: string,
  ): Promise<void> {
    await this.abilities.removeAbilityFromCharacter(
      user.id,
      campaignId,
      characterId,
      characterAbilityId,
    );
  }
}
