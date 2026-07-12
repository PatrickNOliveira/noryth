import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { SessionCharacterService } from '../services/session-character.service';
import { SessionCharacterDto } from '../dto/session-character.dto';
import { AddSessionCharacterDto } from '../dto/add-session-character.dto';
import { UpdateSessionCharacterDto } from '../dto/update-session-character.dto';
import { ChangeFormDto } from '../dto/change-form.dto';

/**
 * Characters placed on the active session map. Reads are open to participants
 * (visibility applies); add/move/remove are master-only (enforced in service).
 */
@Controller('campaigns/:campaignId/session/characters')
export class SessionCharactersController {
  constructor(private readonly service: SessionCharacterService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<SessionCharacterDto[]> {
    return this.service.list(user.id, campaignId);
  }

  @Post()
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: AddSessionCharacterDto,
  ): Promise<SessionCharacterDto> {
    return this.service.add(user.id, campaignId, dto);
  }

  @Patch(':sessionCharacterId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('sessionCharacterId', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSessionCharacterDto,
  ): Promise<SessionCharacterDto> {
    return this.service.update(user.id, campaignId, id, dto);
  }

  @Patch(':sessionCharacterId/form')
  changeForm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('sessionCharacterId', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeFormDto,
  ): Promise<SessionCharacterDto> {
    return this.service.changeForm(user.id, campaignId, id, dto);
  }

  @Delete(':sessionCharacterId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('sessionCharacterId', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.service.remove(user.id, campaignId, id);
  }
}
