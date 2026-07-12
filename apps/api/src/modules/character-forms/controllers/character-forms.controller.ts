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
import { CharacterFormService } from '../services/character-form.service';
import { CharacterFormImageService } from '../services/character-form-image.service';
import { CharacterFormDto } from '../dto/character-form.dto';
import {
  CreateCharacterFormDto,
  UpdateCharacterFormDto,
  UpdateFormAttributesDto,
  UpdateFormAbilitiesDto,
  GenerateFormImageDto,
} from '../dto/form-input.dto';

/** Alternative character forms (campaign preparation). Master-only. */
@Controller('campaigns/:campaignId/characters/:characterId/forms')
export class CharacterFormsController {
  constructor(
    private readonly forms: CharacterFormService,
    private readonly images: CharacterFormImageService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
  ): Promise<CharacterFormDto[]> {
    return this.forms.list(user.id, campaignId, characterId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: CreateCharacterFormDto,
  ): Promise<CharacterFormDto> {
    return this.forms.create(user.id, campaignId, characterId, dto);
  }

  @Patch(':formId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
    @Body() dto: UpdateCharacterFormDto,
  ): Promise<CharacterFormDto> {
    return this.forms.update(user.id, campaignId, characterId, formId, dto);
  }

  @Delete(':formId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
  ): Promise<void> {
    await this.forms.remove(user.id, campaignId, characterId, formId);
  }

  @Post(':formId/set-default')
  setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
  ): Promise<CharacterFormDto> {
    return this.forms.setDefault(user.id, campaignId, characterId, formId);
  }

  @Post(':formId/activate')
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
  ): Promise<CharacterFormDto> {
    return this.forms.activate(user.id, campaignId, characterId, formId);
  }

  @Put(':formId/attributes')
  updateAttributes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
    @Body() dto: UpdateFormAttributesDto,
  ): Promise<CharacterFormDto> {
    return this.forms.updateAttributes(user.id, campaignId, characterId, formId, dto);
  }

  @Put(':formId/abilities')
  updateAbilities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
    @Body() dto: UpdateFormAbilitiesDto,
  ): Promise<CharacterFormDto> {
    return this.forms.updateAbilities(user.id, campaignId, characterId, formId, dto);
  }

  @Post(':formId/generate-image')
  generateImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Param('formId', new ParseUUIDPipe()) formId: string,
    @Body() dto: GenerateFormImageDto,
  ): Promise<CharacterFormDto> {
    return this.images.generate(user.id, campaignId, characterId, formId, {
      adjustments: dto.adjustments,
      ignoreArtDirection: dto.ignoreArtDirection,
    });
  }
}
