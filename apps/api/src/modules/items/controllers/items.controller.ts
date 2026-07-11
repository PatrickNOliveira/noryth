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
import { ItemDefinitionsService } from '../services/item-definitions.service';
import { ItemDefinitionDto } from '../dto/item.dto';
import { CreateItemDefinitionDto } from '../dto/create-item-definition.dto';
import { UpdateItemDefinitionDto } from '../dto/update-item-definition.dto';
import { GenerateItemImageDto } from '../dto/generate-item-image.dto';
import {
  ItemArtDirectionDto,
  UpdateItemArtDirectionDto,
} from '../dto/item-art-direction.dto';

/**
 * Item definition endpoints, scoped to a campaign. Read is open to participants
 * (visibility rules apply); write is master-only — enforced in the service.
 */
@Controller('campaigns/:campaignId/items')
export class ItemsController {
  constructor(private readonly items: ItemDefinitionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ItemDefinitionDto[]> {
    return this.items.list(user.id, campaignId);
  }

  // Declared BEFORE ':itemDefinitionId' so "art-direction" is not parsed as a UUID.
  @Get('art-direction')
  async getArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ItemArtDirectionDto> {
    const itemArtDirection = await this.items.getArtDirection(user.id, campaignId);
    return { itemArtDirection };
  }

  @Put('art-direction')
  async setArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: UpdateItemArtDirectionDto,
  ): Promise<ItemArtDirectionDto> {
    const itemArtDirection = await this.items.setArtDirection(
      user.id,
      campaignId,
      dto.itemArtDirection ?? '',
    );
    return { itemArtDirection };
  }

  @Delete('art-direction')
  async clearArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ItemArtDirectionDto> {
    const itemArtDirection = await this.items.setArtDirection(user.id, campaignId, '');
    return { itemArtDirection };
  }

  @Get(':itemDefinitionId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemDefinitionId', new ParseUUIDPipe()) itemDefinitionId: string,
  ): Promise<ItemDefinitionDto> {
    return this.items.getDetail(user.id, campaignId, itemDefinitionId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateItemDefinitionDto,
  ): Promise<ItemDefinitionDto> {
    return this.items.create(user.id, campaignId, dto);
  }

  @Patch(':itemDefinitionId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemDefinitionId', new ParseUUIDPipe()) itemDefinitionId: string,
    @Body() dto: UpdateItemDefinitionDto,
  ): Promise<ItemDefinitionDto> {
    return this.items.update(user.id, campaignId, itemDefinitionId, dto);
  }

  @Delete(':itemDefinitionId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemDefinitionId', new ParseUUIDPipe()) itemDefinitionId: string,
  ): Promise<void> {
    await this.items.remove(user.id, campaignId, itemDefinitionId);
  }

  @Post(':itemDefinitionId/generate-image')
  generateImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemDefinitionId', new ParseUUIDPipe()) itemDefinitionId: string,
    @Body() dto: GenerateItemImageDto,
  ): Promise<ItemDefinitionDto> {
    return this.items.generateImage(user.id, campaignId, itemDefinitionId, {
      adjustments: dto.adjustments,
      ignoreArtDirection: dto.ignoreCampaignArtDirection,
    });
  }

  @Post(':itemDefinitionId/regenerate-image')
  regenerateImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('itemDefinitionId', new ParseUUIDPipe()) itemDefinitionId: string,
    @Body() dto: GenerateItemImageDto,
  ): Promise<ItemDefinitionDto> {
    return this.items.generateImage(user.id, campaignId, itemDefinitionId, {
      adjustments: dto.adjustments,
      ignoreArtDirection: dto.ignoreCampaignArtDirection,
    });
  }
}
