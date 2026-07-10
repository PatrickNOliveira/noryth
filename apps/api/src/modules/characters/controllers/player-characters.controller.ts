import {
  Body,
  Controller,
  Get,
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
import { CharactersService } from '../services/characters.service';
import { CharacterDto } from '../dto/character.dto';
import { CreatePlayerCharacterDto } from '../dto/create-player-character.dto';
import { UpdatePlayerCharacterDto } from '../dto/update-player-character.dto';
import {
  DistributeAttributesDto,
  SetDefaultBudgetDto,
} from '../dto/attribute-budget.dto';
import { GenerateCharacterImageDto } from '../dto/generate-character-image.dto';

/**
 * Player-character endpoints. A participant manages THEIR own character here;
 * the master may also act on any character. Field-level permission is enforced
 * in the service (players never touch budget, master notes or visibility).
 */
@Controller('campaigns/:campaignId/player-characters')
export class PlayerCharactersController {
  constructor(private readonly characters: CharactersService) {}

  // Static paths declared before ':characterId'.
  @Get('mine')
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CharacterDto | null> {
    return this.characters.getMine(user.id, campaignId);
  }

  @Get('default-attribute-budget')
  async getDefaultBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<{ defaultPlayerCharacterAttributePoints: number | null }> {
    const value = await this.characters.getDefaultBudget(user.id, campaignId);
    return { defaultPlayerCharacterAttributePoints: value };
  }

  @Put('default-attribute-budget')
  async setDefaultBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: SetDefaultBudgetDto,
  ): Promise<{ defaultPlayerCharacterAttributePoints: number | null }> {
    const value = await this.characters.setDefaultBudget(
      user.id,
      campaignId,
      dto.defaultPlayerCharacterAttributePoints ?? null,
    );
    return { defaultPlayerCharacterAttributePoints: value };
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreatePlayerCharacterDto,
  ): Promise<CharacterDto> {
    return this.characters.createPlayerCharacter(user.id, campaignId, dto);
  }

  @Patch(':characterId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: UpdatePlayerCharacterDto,
  ): Promise<CharacterDto> {
    return this.characters.updatePlayerCharacter(
      user.id,
      campaignId,
      characterId,
      dto,
    );
  }

  @Put(':characterId/attributes')
  distribute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: DistributeAttributesDto,
  ): Promise<CharacterDto> {
    return this.characters.distributeAttributes(
      user.id,
      campaignId,
      characterId,
      dto.attributes,
    );
  }

  @Post(':characterId/regenerate-image')
  regenerateImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: GenerateCharacterImageDto,
  ): Promise<CharacterDto> {
    return this.characters.generateImage(user.id, campaignId, characterId, {
      adjustments: dto.adjustments,
      ignoreArtDirection: dto.ignoreCampaignArtDirection,
    });
  }
}
