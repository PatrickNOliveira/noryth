import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@shared/decorators/current-user.decorator';
import { CampaignParticipantsService } from '../services/campaign-participants.service';
import { ParticipantDto } from '../dto/participant.dto';
import { JoinCampaignDto } from '../dto/join-campaign.dto';
import { SetMasterDto } from '../dto/set-master.dto';

/**
 * Membership endpoints for a campaign. Authorization lives in the service:
 * anyone may join (subject to password/limit); only participants may list;
 * only the owner may change the master.
 */
@Controller('campaigns/:campaignId')
export class CampaignParticipantsController {
  constructor(private readonly participants: CampaignParticipantsService) {}

  @Post('join')
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: JoinCampaignDto,
  ): Promise<ParticipantDto> {
    return this.participants.join(user.id, campaignId, dto.password);
  }

  @Get('participants')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
  ): Promise<ParticipantDto[]> {
    return this.participants.list(user.id, campaignId);
  }

  @Patch('master')
  setMaster(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: SetMasterDto,
  ): Promise<ParticipantDto[]> {
    return this.participants.setMaster(user.id, campaignId, dto.userId);
  }
}
