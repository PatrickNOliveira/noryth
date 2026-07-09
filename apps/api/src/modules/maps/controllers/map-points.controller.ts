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
import { MapPointsService } from '../services/map-points.service';
import { MapPointDto } from '../dto/map.dto';
import {
  CreateMapPointDto,
  UpdateMapPointDto,
} from '../dto/map-point.dto';

/** Points of interest, scoped to a map. Write is master-only. */
@Controller('campaigns/:campaignId/maps/:mapId/points')
export class MapPointsController {
  constructor(private readonly points: MapPointsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
  ): Promise<MapPointDto[]> {
    return this.points.list(user.id, campaignId, mapId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
    @Body() dto: CreateMapPointDto,
  ): Promise<MapPointDto> {
    return this.points.create(user.id, campaignId, mapId, dto);
  }

  @Patch(':pointId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
    @Param('pointId', new ParseUUIDPipe()) pointId: string,
    @Body() dto: UpdateMapPointDto,
  ): Promise<MapPointDto> {
    return this.points.update(user.id, campaignId, mapId, pointId, dto);
  }

  @Delete(':pointId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
    @Param('pointId', new ParseUUIDPipe()) pointId: string,
  ): Promise<void> {
    await this.points.remove(user.id, campaignId, mapId, pointId);
  }
}
