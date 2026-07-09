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
import { CharactersService } from '../services/characters.service';
import { CharacterDto } from '../dto/character.dto';
import { CreateCharacterDto } from '../dto/create-character.dto';
import { UpdateCharacterDto } from '../dto/update-character.dto';
import { GenerateCharacterImageDto } from '../dto/generate-character-image.dto';
import { ArtDirectionDto, UpdateArtDirectionDto } from '../dto/art-direction.dto';

/**
 * Character endpoints, scoped to a campaign. Read is open to participants (with
 * player visibility rules); write is master-only — all enforced in the service.
 */
@Controller('campaigns/:campaignId/characters')
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CharacterDto[]> {
    return this.characters.list(user.id, campaignId);
  }

  // Declared BEFORE ':characterId' so "art-direction" is not parsed as a UUID.
  @Get('art-direction')
  async getArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ArtDirectionDto> {
    const characterArtDirection = await this.characters.getArtDirection(
      user.id,
      campaignId,
    );
    return { characterArtDirection };
  }

  @Put('art-direction')
  async setArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: UpdateArtDirectionDto,
  ): Promise<ArtDirectionDto> {
    const characterArtDirection = await this.characters.setArtDirection(
      user.id,
      campaignId,
      dto.characterArtDirection ?? '',
    );
    return { characterArtDirection };
  }

  @Delete('art-direction')
  async clearArtDirection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ArtDirectionDto> {
    const characterArtDirection = await this.characters.setArtDirection(
      user.id,
      campaignId,
      '',
    );
    return { characterArtDirection };
  }

  @Get(':characterId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
  ): Promise<CharacterDto> {
    return this.characters.getDetail(user.id, campaignId, characterId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterDto> {
    return this.characters.create(user.id, campaignId, dto);
  }

  @Patch(':characterId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: UpdateCharacterDto,
  ): Promise<CharacterDto> {
    return this.characters.update(user.id, campaignId, characterId, dto);
  }

  @Delete(':characterId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
  ): Promise<void> {
    await this.characters.remove(user.id, campaignId, characterId);
  }

  @Post(':characterId/generate-image')
  generateImage(
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

  /** Regenerate / ask for changes on an existing portrait (master only). */
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
