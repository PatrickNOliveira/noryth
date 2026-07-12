import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { FormSpriteView } from '@modules/character-forms/services/character-form-session-sprite.service';
import { SessionCharacterService } from '../services/session-character.service';
import { GenerateSpritesDto } from '../dto/generate-sprites.dto';

/**
 * (Re)generate a placed character's 2.5D session sprites. Master OR controller.
 * Targets the character's ACTIVE FORM sprites — the exact assets shown on the map
 * — so "regenerate" refreshes only that character's sprite (scoped by
 * character/form/direction) and never affects any other character.
 */
@Controller('campaigns/:campaignId/characters/:characterId/session-sprites')
export class CharacterSessionSpritesController {
  constructor(private readonly sessionCharacters: SessionCharacterService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: GenerateSpritesDto,
  ): Promise<FormSpriteView[]> {
    return this.sessionCharacters.regenerateSprites(
      user.id,
      campaignId,
      characterId,
      dto.directions,
    );
  }
}
