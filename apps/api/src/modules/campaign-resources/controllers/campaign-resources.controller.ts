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
import { CampaignResourceService } from '../services/campaign-resource.service';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import {
  ResourceDefinitionDto,
  toResourceDefinitionDto,
} from '../dto/resource.dto';

/**
 * Campaign resource definitions, scoped to a campaign. Read is open to any
 * participant; create/update/remove are master-only (enforced in the service).
 */
@Controller('campaigns/:campaignId/resources')
export class CampaignResourcesController {
  constructor(private readonly resources: CampaignResourceService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ResourceDefinitionDto[]> {
    const list = await this.resources.list(user.id, campaignId);
    return list.map(toResourceDefinitionDto);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateResourceDto,
  ): Promise<ResourceDefinitionDto> {
    const created = await this.resources.create(user.id, campaignId, dto);
    return toResourceDefinitionDto(created);
  }

  @Patch(':resourceId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceDefinitionDto> {
    const updated = await this.resources.update(
      user.id,
      campaignId,
      resourceId,
      dto,
    );
    return toResourceDefinitionDto(updated);
  }

  @Delete(':resourceId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<void> {
    await this.resources.remove(user.id, campaignId, resourceId);
  }
}
