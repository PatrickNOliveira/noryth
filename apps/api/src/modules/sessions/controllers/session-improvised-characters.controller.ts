import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { CreateCharacterDto } from '@modules/characters/dto/create-character.dto';
import { CharacterDto } from '@modules/characters/dto/character.dto';
import { SessionImprovisedCharacterService } from '../services/session-improvised-character.service';
import {
  CompleteImprovisedCharacterDto,
  ImprovisedCharacterDraftDto,
} from '../dto/improvise-character.dto';

/**
 * Endpoints for improvising a character during a live session. Master-only and
 * requires an active session (both enforced in the service). Distinct paths from
 * the placement endpoints (`POST /session/characters` adds an existing character
 * to the map), so there is no route collision.
 */
@Controller('campaigns/:campaignId/session/characters')
export class SessionImprovisedCharactersController {
  constructor(private readonly service: SessionImprovisedCharacterService) {}

  /** AI-completes the master's partial character, returning a draft to review. */
  @Post('ai-complete')
  aiComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CompleteImprovisedCharacterDto,
  ): Promise<ImprovisedCharacterDraftDto> {
    return this.service.completeWithAi(user.id, campaignId, dto);
  }

  /** Creates the improvised character as a normal campaign character. */
  @Post('create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterDto> {
    return this.service.create(user.id, campaignId, dto);
  }
}
