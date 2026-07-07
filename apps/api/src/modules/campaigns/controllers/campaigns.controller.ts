import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { CampaignsService } from '../services/campaigns.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CampaignDto, toCampaignDto } from '../dto/campaign.dto';
import { COVER_ALLOWED_MIME, COVER_MAX_BYTES } from '../campaign.constants';

/** Multer filter accepting only the allowed image types. */
function coverFileFilter(
  _req: Request,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if ((COVER_ALLOWED_MIME as readonly string[]).includes(file.mimetype)) {
    callback(null, true);
    return;
  }
  callback(
    new BadRequestException('Formato de imagem inválido. Use JPG, PNG ou WEBP.'),
    false,
  );
}

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('coverImage', {
      limits: { fileSize: COVER_MAX_BYTES },
      fileFilter: coverFileFilter,
    }),
  )
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
    @UploadedFile() cover?: Express.Multer.File,
  ): Promise<CampaignDto> {
    const campaign = await this.campaigns.create(
      user.id,
      dto,
      cover ? { buffer: cover.buffer, mimetype: cover.mimetype } : undefined,
    );
    return toCampaignDto(campaign);
  }

  @Get('my')
  async findMine(@CurrentUser() user: AuthenticatedUser): Promise<CampaignDto[]> {
    const list = await this.campaigns.findMine(user.id);
    return list.map(toCampaignDto);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CampaignDto> {
    const campaign = await this.campaigns.findOwnedOrFail(user.id, id);
    return toCampaignDto(campaign);
  }
}
