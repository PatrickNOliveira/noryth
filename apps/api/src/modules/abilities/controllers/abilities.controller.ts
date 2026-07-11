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
  Query,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { AbilitiesService } from '../services/abilities.service';
import { AbilityDefinitionDto } from '../dto/ability.dto';
import { CreateAbilityDto } from '../dto/create-ability.dto';
import { UpdateAbilityDto } from '../dto/update-ability.dto';
import { ReviewAbilityDto } from '../dto/review-ability.dto';

/** Campaign ability endpoints. Write is master-only; reads honor visibility. */
@Controller('campaigns/:campaignId/abilities')
export class AbilitiesController {
  constructor(private readonly abilities: AbilitiesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Query('status') status?: string,
    @Query('createdBy') createdBy?: string,
    @Query('proposedForCharacterId') proposedForCharacterId?: string,
  ): Promise<AbilityDefinitionDto[]> {
    return this.abilities.list(user.id, campaignId, {
      status,
      createdByMe: createdBy === 'me',
      proposedForCharacterId,
    });
  }

  // Declared BEFORE ':abilityId'.
  @Get('pending')
  listPending(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<AbilityDefinitionDto[]> {
    return this.abilities.listPending(user.id, campaignId);
  }

  @Get(':abilityId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.getDetail(user.id, campaignId, abilityId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.create(user.id, campaignId, dto);
  }

  @Patch(':abilityId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
    @Body() dto: UpdateAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.update(user.id, campaignId, abilityId, dto);
  }

  @Delete(':abilityId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
  ): Promise<void> {
    await this.abilities.remove(user.id, campaignId, abilityId);
  }

  @Post(':abilityId/approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
    @Body() dto: ReviewAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.approve(user.id, campaignId, abilityId, dto.reviewNotes);
  }

  @Post(':abilityId/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
    @Body() dto: ReviewAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.reject(user.id, campaignId, abilityId, dto.reviewNotes);
  }

  @Post(':abilityId/request-changes')
  requestChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('abilityId', new ParseUUIDPipe()) abilityId: string,
    @Body() dto: ReviewAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    return this.abilities.requestChanges(user.id, campaignId, abilityId, dto.reviewNotes);
  }
}
