import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import {
  SessionImprovisedItemService,
  SessionItemResult,
} from '../services/session-improvised-item.service';
import {
  CompleteImprovisedItemDto,
  CreateSessionItemDto,
  ImprovisedItemDraftDto,
} from '../dto/improvise-item.dto';

/**
 * Endpoints for improvising an item during a live session. Master-only and
 * requires an active session (both enforced in the service).
 */
@Controller('campaigns/:campaignId/session/items')
export class SessionImprovisedItemsController {
  constructor(private readonly service: SessionImprovisedItemService) {}

  /** AI-completes the master's partial item, returning a draft to review. */
  @Post('ai-complete')
  aiComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CompleteImprovisedItemDto,
  ): Promise<ImprovisedItemDraftDto> {
    return this.service.completeWithAi(user.id, campaignId, dto);
  }

  /** Creates the improvised item (definition + optional first instance). */
  @Post('create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateSessionItemDto,
  ): Promise<SessionItemResult> {
    return this.service.create(user.id, campaignId, dto);
  }
}
