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
import { ItemInstancesService } from '../services/item-instances.service';
import { ItemInstanceDto } from '../dto/item.dto';
import { CreateItemInstanceDto } from '../dto/create-item-instance.dto';
import { UpdateItemInstanceDto } from '../dto/update-item-instance.dto';

/** Item instance endpoints, scoped to a campaign. Write is master-only. */
@Controller('campaigns/:campaignId/item-instances')
export class ItemInstancesController {
  constructor(private readonly instances: ItemInstancesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Query('itemDefinitionId') itemDefinitionId?: string,
    @Query('holderCharacterId') holderCharacterId?: string,
    @Query('mapId') mapId?: string,
    @Query('mapPointOfInterestId') mapPointOfInterestId?: string,
  ): Promise<ItemInstanceDto[]> {
    return this.instances.list(user.id, campaignId, {
      itemDefinitionId,
      holderCharacterId,
      mapId,
      mapPointOfInterestId,
    });
  }

  @Get(':itemInstanceId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemInstanceId', new ParseUUIDPipe()) itemInstanceId: string,
  ): Promise<ItemInstanceDto> {
    return this.instances.getDetail(user.id, campaignId, itemInstanceId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateItemInstanceDto,
  ): Promise<ItemInstanceDto> {
    return this.instances.create(user.id, campaignId, dto);
  }

  @Patch(':itemInstanceId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemInstanceId', new ParseUUIDPipe()) itemInstanceId: string,
    @Body() dto: UpdateItemInstanceDto,
  ): Promise<ItemInstanceDto> {
    return this.instances.update(user.id, campaignId, itemInstanceId, dto);
  }

  @Delete(':itemInstanceId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemInstanceId', new ParseUUIDPipe()) itemInstanceId: string,
  ): Promise<void> {
    await this.instances.remove(user.id, campaignId, itemInstanceId);
  }
}
