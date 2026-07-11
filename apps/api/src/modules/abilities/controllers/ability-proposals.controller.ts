import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { AbilitiesService } from '../services/abilities.service';
import { AbilityDefinitionDto } from '../dto/ability.dto';
import {
  ProposeAbilityDto,
  UpdateProposalDto,
} from '../dto/propose-ability.dto';

/**
 * Player ability proposals for THEIR own character. Creation and edits are
 * limited to the controlling player; the master reviews via the abilities
 * endpoints. Enforced in the service.
 */
@Controller('campaigns/:campaignId/player-characters/:characterId/ability-proposals')
export class AbilityProposalsController {
  constructor(private readonly abilities: AbilitiesService) {}

  @Post()
  propose(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: ProposeAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.propose(user.id, campaignId, characterId, dto);
  }

  @Patch(':abilityId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) _characterId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
    @Body() dto: UpdateProposalDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.updateProposal(user.id, campaignId, abilityId, dto);
  }
}
