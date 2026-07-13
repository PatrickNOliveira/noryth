import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { SessionDiceRollService } from '../services/session-dice-roll.service';
import { RollDiceDto } from '../dto/roll-dice.dto';
import { SessionDiceRollDto } from '../dto/dice-roll.dto';

/**
 * Dice rolls during a live session. Master-only (enforced in the service). Mounted
 * under the campaign session, consistent with the rest of the session API.
 */
@Controller('campaigns/:campaignId/session/dice-rolls')
export class SessionDiceRollsController {
  constructor(private readonly service: SessionDiceRollService) {}

  @Post()
  roll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: RollDiceDto,
  ): Promise<SessionDiceRollDto> {
    return this.service.roll(user.id, user.name, campaignId, dto);
  }
}
