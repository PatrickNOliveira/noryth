import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { SessionsService } from '../services/sessions.service';
import { SessionDto } from '../dto/session.dto';
import { StartSessionDto } from '../dto/start-session.dto';
import { ChangeMapDto, ChangeMapResultDto } from '../dto/change-map.dto';
import { EndSessionResultDto } from '../dto/end-session.dto';

/**
 * Campaign session endpoints. Starting is master-only; reading the active
 * session is open to any participant. Mounted under the campaign, consistent
 * with the rest of the API (`campaigns/:campaignId/...`).
 */
@Controller('campaigns/:campaignId/session')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('start')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: StartSessionDto,
  ): Promise<SessionDto> {
    return this.sessions.start(user.id, campaignId, dto);
  }

  @Get('active')
  active(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<SessionDto | null> {
    return this.sessions.getActive(user.id, campaignId);
  }

  @Patch('change-map')
  changeMap(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: ChangeMapDto,
  ): Promise<ChangeMapResultDto> {
    return this.sessions.changeMap(user.id, campaignId, dto);
  }

  @Post('end')
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<EndSessionResultDto> {
    return this.sessions.endSession(user.id, campaignId);
  }
}
