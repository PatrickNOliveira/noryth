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
import { CampaignAttributesService } from '../services/campaign-attributes.service';
import { CreateCampaignAttributeDto } from '../dto/create-campaign-attribute.dto';
import { UpdateCampaignAttributeDto } from '../dto/update-campaign-attribute.dto';
import {
  CampaignAttributeDto,
  toCampaignAttributeDto,
} from '../dto/campaign-attribute.dto';

/**
 * Character attributes are scoped to a campaign/table. Every route resolves the
 * owner through the service, so only the master can read or manage them.
 */
@Controller('campaigns/:campaignId/attributes')
export class CampaignAttributesController {
  constructor(private readonly attributes: CampaignAttributesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignAttributeDto[]> {
    const list = await this.attributes.list(user.id, campaignId);
    return list.map(toCampaignAttributeDto);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateCampaignAttributeDto,
  ): Promise<CampaignAttributeDto> {
    const created = await this.attributes.create(user.id, campaignId, dto);
    return toCampaignAttributeDto(created);
  }

  @Patch(':attributeId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('attributeId', new ParseUUIDPipe()) attributeId: string,
    @Body() dto: UpdateCampaignAttributeDto,
  ): Promise<CampaignAttributeDto> {
    const updated = await this.attributes.update(
      user.id,
      campaignId,
      attributeId,
      dto,
    );
    return toCampaignAttributeDto(updated);
  }

  @Delete(':attributeId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('attributeId', new ParseUUIDPipe()) attributeId: string,
  ): Promise<void> {
    await this.attributes.remove(user.id, campaignId, attributeId);
  }
}
