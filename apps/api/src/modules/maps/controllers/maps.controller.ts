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
  Put,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { MapsService } from '../services/maps.service';
import { MapDto } from '../dto/map.dto';
import { CreateMapDto } from '../dto/create-map.dto';
import { UpdateMapDto } from '../dto/update-map.dto';
import { GenerateMapImageDto } from '../dto/generate-map-image.dto';
import {
  MapArtDirectionDto,
  UpdateMapArtDirectionDto,
} from '../dto/map-art-direction.dto';

/**
 * Map endpoints, scoped to a campaign. Read is open to participants (visibility
 * rules apply); write is master-only — enforced in the service.
 */
@Controller('campaigns/:campaignId/maps')
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<MapDto[]> {
    return this.maps.list(user.id, campaignId);
  }

  // Declared BEFORE ':mapId' so "art-direction" is not parsed as a UUID.
  @Get('art-direction')
  async getArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<MapArtDirectionDto> {
    const mapArtDirection = await this.maps.getArtDirection(user.id, campaignId);
    return { mapArtDirection };
  }

  @Put('art-direction')
  async setArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: UpdateMapArtDirectionDto,
  ): Promise<MapArtDirectionDto> {
    const mapArtDirection = await this.maps.setArtDirection(
      user.id,
      campaignId,
      dto.mapArtDirection ?? '',
    );
    return { mapArtDirection };
  }

  @Delete('art-direction')
  async clearArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<MapArtDirectionDto> {
    const mapArtDirection = await this.maps.setArtDirection(user.id, campaignId, '');
    return { mapArtDirection };
  }

  @Get(':mapId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
  ): Promise<MapDto> {
    return this.maps.getDetail(user.id, campaignId, mapId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateMapDto,
  ): Promise<MapDto> {
    return this.maps.create(user.id, campaignId, dto);
  }

  @Patch(':mapId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
    @Body() dto: UpdateMapDto,
  ): Promise<MapDto> {
    return this.maps.update(user.id, campaignId, mapId, dto);
  }

  @Delete(':mapId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
  ): Promise<void> {
    await this.maps.remove(user.id, campaignId, mapId);
  }

  @Post(':mapId/generate-image')
  generateImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
    @Body() dto: GenerateMapImageDto,
  ): Promise<MapDto> {
    return this.maps.generateImage(user.id, campaignId, mapId, {
      adjustments: dto.adjustments,
      ignoreArtDirection: dto.ignoreCampaignArtDirection,
      includeLabels: dto.includeLabels,
    });
  }

  @Post(':mapId/regenerate-image')
  regenerateImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('mapId', new ParseUUIDPipe()) mapId: string,
    @Body() dto: GenerateMapImageDto,
  ): Promise<MapDto> {
    return this.maps.generateImage(user.id, campaignId, mapId, {
      adjustments: dto.adjustments,
      ignoreArtDirection: dto.ignoreCampaignArtDirection,
      includeLabels: dto.includeLabels,
    });
  }
}
