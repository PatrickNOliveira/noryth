import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { comparePassword } from '@shared/utils/hash.util';
import {
  PRESENCE_PROVIDER,
  PresenceProvider,
} from '@shared/providers/presence/presence.provider';
import { UsersService } from '@modules/users/users.service';
import { Campaign } from '../entities/campaign.entity';
import { CampaignParticipant } from '../entities/campaign-participant.entity';
import { ParticipantDto, toParticipantDto } from '../dto/participant.dto';
import { CampaignsService } from './campaigns.service';
import {
  CAMPAIGN_PARTICIPANTS_REPOSITORY,
  CampaignParticipantsRepository,
} from '../repositories/campaign-participants.repository';

/**
 * Application service for campaign membership: joining, listing participants and
 * (owner-only) changing the master. Owner/master are authoritative on the
 * campaign; this service keeps the membership table and derives roles from it.
 *
 * It depends only on ports (repository, {@link PresenceProvider}) and other
 * application services — never on Socket.IO or Redis.
 */
@Injectable()
export class CampaignParticipantsService {
  constructor(
    @Inject(CAMPAIGN_PARTICIPANTS_REPOSITORY)
    private readonly participants: CampaignParticipantsRepository,
    @Inject(PRESENCE_PROVIDER)
    private readonly presence: PresenceProvider,
    private readonly campaigns: CampaignsService,
    private readonly users: UsersService,
  ) {}

  /** Lists participants (owner/master/players) with derived role + presence. */
  async list(userId: string, campaignId: string): Promise<ParticipantDto[]> {
    const campaign = await this.campaigns.findByIdOrFail(campaignId);
    await this.assertParticipant(campaignId, userId);

    const rows = await this.participants.findByCampaign(campaignId);
    const users = await this.users.findByIds(rows.map((r) => r.userId));
    const usersById = new Map(users.map((u) => [u.id, u]));
    const onlineIds = new Set(this.presence.getOnlineUserIds(campaignId));

    return rows.map((row) =>
      toParticipantDto(
        row,
        usersById.get(row.userId),
        campaign.ownerId,
        campaign.masterId,
        onlineIds.has(row.userId),
      ),
    );
  }

  /**
   * Joins the authenticated user as a player. Validates password (when set),
   * duplicate membership and the player limit.
   */
  async join(
    userId: string,
    campaignId: string,
    password?: string,
  ): Promise<ParticipantDto> {
    const campaign = await this.campaigns.findByIdOrFail(campaignId);

    if (await this.participants.exists(campaignId, userId)) {
      throw new ConflictException('Você já participa desta mesa.');
    }

    await this.assertPassword(campaign, password);
    await this.assertPlayerSlotAvailable(campaign);

    const saved = await this.participants.save(
      this.participants.createEntity({ campaignId, userId }),
    );
    const user = await this.users.findByIdOrFail(userId);
    return toParticipantDto(
      saved,
      user,
      campaign.ownerId,
      campaign.masterId,
      this.presence.getOnlineUserIds(campaignId).includes(userId),
    );
  }

  /**
   * Owner-only: designates another participant as master. The new master must
   * already be part of the campaign. Setting the owner back as master is fine.
   */
  async setMaster(
    ownerId: string,
    campaignId: string,
    newMasterUserId: string,
  ): Promise<ParticipantDto[]> {
    const campaign = await this.campaigns.findByIdOrFail(campaignId);

    if (campaign.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o dono da mesa pode definir o mestre.',
      );
    }
    if (!(await this.participants.exists(campaignId, newMasterUserId))) {
      throw new BadRequestException(
        'O novo mestre precisa ser participante da mesa.',
      );
    }

    await this.campaigns.updateMaster(campaign, newMasterUserId);
    return this.list(ownerId, campaignId);
  }

  // ── invariants ──────────────────────────────────────────────

  private async assertParticipant(
    campaignId: string,
    userId: string,
  ): Promise<void> {
    if (!(await this.participants.exists(campaignId, userId))) {
      throw new ForbiddenException('Você não participa desta mesa.');
    }
  }

  private async assertPassword(
    campaign: Campaign,
    password?: string,
  ): Promise<void> {
    if (!campaign.passwordHash) return;
    const ok = password
      ? await comparePassword(password, campaign.passwordHash)
      : false;
    if (!ok) {
      throw new ForbiddenException('Senha da mesa incorreta.');
    }
  }

  /**
   * Player-limit rule (explicit): `maxPlayers` null → unlimited; `0` → zero
   * players allowed; `N` → at most N players. Owner and master are NOT counted
   * as players.
   */
  private async assertPlayerSlotAvailable(campaign: Campaign): Promise<void> {
    if (campaign.maxPlayers == null) return;

    const rows = await this.participants.findByCampaign(campaign.id);
    const playerCount = rows.filter(
      (r: CampaignParticipant) =>
        r.userId !== campaign.ownerId && r.userId !== campaign.masterId,
    ).length;

    if (playerCount >= campaign.maxPlayers) {
      throw new ConflictException(
        'Esta mesa já atingiu o limite máximo de jogadores.',
      );
    }
  }
}
