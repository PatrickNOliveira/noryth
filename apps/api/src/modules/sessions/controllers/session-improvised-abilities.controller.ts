import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import {
  SessionAbilityResult,
  SessionImprovisedAbilityService,
} from '../services/session-improvised-ability.service';
import {
  CompleteImprovisedAbilityDto,
  CreateSessionAbilityDto,
  ImprovisedAbilityDraftDto,
} from '../dto/improvise-ability.dto';

/**
 * Endpoints for improvising an ability during a live session. Master-only and
 * requires an active session (both enforced in the service).
 */
@Controller('campaigns/:campaignId/session/abilities')
export class SessionImprovisedAbilitiesController {
  constructor(private readonly service: SessionImprovisedAbilityService) {}

  /** AI-completes the master's partial ability, returning a draft to review. */
  @Post('ai-complete')
  aiComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CompleteImprovisedAbilityDto,
  ): Promise<ImprovisedAbilityDraftDto> {
    return this.service.completeWithAi(user.id, campaignId, dto);
  }

  /** Creates the improvised ability (definition + optional character/form link). */
  @Post('create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateSessionAbilityDto,
  ): Promise<SessionAbilityResult> {
    return this.service.create(user.id, campaignId, dto);
  }
}
