import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { FactionsService } from '../services/factions.service';
import { CreateFactionDto } from '../dto/create-faction.dto';
import { RegenerateFactionImageDto } from '../dto/regenerate-faction-image.dto';
import { FactionDto, toFactionDto } from '../dto/faction.dto';

@Controller('campaigns/:campaignId/factions')
export class FactionsController {
  constructor(private readonly factions: FactionsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateFactionDto,
  ): Promise<FactionDto> {
    const { faction, images } = await this.factions.create(user.id, campaignId, dto);
    return toFactionDto(faction, images);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<FactionDto[]> {
    const list = await this.factions.listByCampaign(user.id, campaignId);
    return list.map((f) => toFactionDto(f));
  }

  @Get(':factionId')
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('factionId', new ParseUUIDPipe()) factionId: string,
  ): Promise<FactionDto> {
    const { faction, images } = await this.factions.getDetail(
      user.id,
      campaignId,
      factionId,
    );
    return toFactionDto(faction, images);
  }

  @Post(':factionId/regenerate')
  async regenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('factionId', new ParseUUIDPipe()) factionId: string,
    @Body() dto: RegenerateFactionImageDto,
  ): Promise<FactionDto> {
    const { faction, images } = await this.factions.regenerate(
      user.id,
      campaignId,
      factionId,
      dto.notes,
    );
    return toFactionDto(faction, images);
  }

  @Post(':factionId/approve')
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('factionId', new ParseUUIDPipe()) factionId: string,
  ): Promise<FactionDto> {
    const { faction, images } = await this.factions.approve(
      user.id,
      campaignId,
      factionId,
    );
    return toFactionDto(faction, images);
  }

  @Post(':factionId/reject')
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('factionId', new ParseUUIDPipe()) factionId: string,
  ): Promise<FactionDto> {
    const { faction, images } = await this.factions.reject(
      user.id,
      campaignId,
      factionId,
    );
    return toFactionDto(faction, images);
  }
}
