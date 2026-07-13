import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { SessionCharacterResourceService } from '../services/session-character-resource.service';
import { AdjustSessionResourceDto } from '../dto/adjust-session-resource.dto';
import { SessionCharacterResourceDto } from '../dto/session-character-resource.dto';

/**
 * Adjusts (spend/add) a placed character's resource during a session. Master-only
 * (enforced in the service). Contextualized by sessionCharacterId because the
 * action happens on the session map.
 */
@Controller('campaigns/:campaignId/session/characters/:sessionCharacterId/resources')
export class SessionCharacterResourcesController {
  constructor(private readonly service: SessionCharacterResourceService) {}

  @Patch(':resourceDefinitionId/adjust')
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('sessionCharacterId', new ParseUUIDPipe()) sessionCharacterId: string,
    @Param('resourceDefinitionId', new ParseUUIDPipe()) resourceDefinitionId: string,
    @Body() dto: AdjustSessionResourceDto,
  ): Promise<SessionCharacterResourceDto> {
    return this.service.adjust(
      user.id,
      campaignId,
      sessionCharacterId,
      resourceDefinitionId,
      dto,
    );
  }
}
