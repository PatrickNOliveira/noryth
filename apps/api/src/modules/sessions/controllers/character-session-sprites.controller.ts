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
import {
  CharacterSessionSpriteService,
  SpriteView,
} from '../services/character-session-sprite.service';
import { GenerateSpritesDto } from '../dto/generate-sprites.dto';

/** (Re)generate a character's 2.5D session sprites. Master OR controller. */
@Controller('campaigns/:campaignId/characters/:characterId/session-sprites')
export class CharacterSessionSpritesController {
  constructor(private readonly sprites: CharacterSessionSpriteService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: GenerateSpritesDto,
  ): Promise<SpriteView[]> {
    return this.sprites.generate(user.id, campaignId, characterId, dto.directions);
  }
}
