import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from '@shared/utils/hash.util';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@shared/providers/storage/storage.provider';
import { Campaign } from '../entities/campaign.entity';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { COVER_ALLOWED_EXT } from '../campaign.constants';
import {
  CAMPAIGNS_REPOSITORY,
  CampaignsRepository,
} from '../repositories/campaigns.repository';
import {
  CAMPAIGN_PARTICIPANTS_REPOSITORY,
  CampaignParticipantsRepository,
} from '../repositories/campaign-participants.repository';

/** Minimal shape of the uploaded cover file (Multer). */
export interface UploadedCover {
  buffer: Buffer;
  mimetype: string;
}

/**
 * Application service for campaigns. Owns creation invariants (owner = master
 * = creator, status starts active, passwords stored hashed) and delegates
 * cover storage to the abstract {@link StorageProvider} — it never knows MinIO.
 */
@Injectable()
export class CampaignsService {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaigns: CampaignsRepository,
    @Inject(CAMPAIGN_PARTICIPANTS_REPOSITORY)
    private readonly participants: CampaignParticipantsRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  async create(
    userId: string,
    dto: CreateCampaignDto,
    cover?: UploadedCover,
  ): Promise<Campaign> {
    const theme = dto.theme === 'custom' && dto.customTheme ? dto.customTheme : dto.theme;
    const tone = dto.tone === 'custom' && dto.customTone ? dto.customTone : dto.tone;

    const campaign = this.campaigns.createEntity({
      ownerId: userId,
      masterId: userId,
      name: dto.name.trim(),
      theme,
      shortDescription: dto.shortDescription.trim(),
      premise: dto.premise.trim(),
      tone,
      mainLanguage: dto.mainLanguage,
      visibility: dto.visibility,
      passwordHash: dto.password ? await hashPassword(dto.password) : null,
      maxPlayers: dto.maxPlayers ?? null,
      coverImagePath: null,
      coverImageUrl: null,
      status: 'active',
    });

    let saved = await this.campaigns.save(campaign);

    // The creator is owner AND initial master, and must appear in the
    // participant list — so they get a membership row like everyone else.
    await this.participants.save(
      this.participants.createEntity({ campaignId: saved.id, userId }),
    );

    if (cover) {
      const ext = COVER_ALLOWED_EXT[cover.mimetype] ?? 'bin';
      const path = `campaigns/${saved.id}/cover/cover.${ext}`;
      const uploaded = await this.storage.upload({
        path,
        buffer: cover.buffer,
        contentType: cover.mimetype,
      });
      saved.coverImagePath = uploaded.path;
      saved.coverImageUrl = uploaded.url;
      saved = await this.campaigns.save(saved);
    }

    return saved;
  }

  /** Campaigns the user takes part in — owner, master OR player (no dups). */
  findMine(userId: string): Promise<Campaign[]> {
    return this.campaigns.findByParticipant(userId);
  }

  async findByIdOrFail(id: string): Promise<Campaign> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }
    return campaign;
  }

  /** Public campaigns anyone may discover and join. */
  findPublic(): Promise<Campaign[]> {
    return this.campaigns.findPublic();
  }

  /**
   * Minimal join info for any authenticated user (used by discovery and the
   * share/join screen). Computes membership and the current player count.
   */
  async getSummary(
    userId: string,
    id: string,
  ): Promise<{ campaign: Campaign; isParticipant: boolean; playerCount: number }> {
    const campaign = await this.findByIdOrFail(id);
    const rows = await this.participants.findByCampaign(id);
    const isParticipant = rows.some((r) => r.userId === userId);
    const playerCount = rows.filter(
      (r) => r.userId !== campaign.ownerId && r.userId !== campaign.masterId,
    ).length;
    return { campaign, isParticipant, playerCount };
  }

  async findOwnedOrFail(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.findByIdOrFail(id);
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta campanha');
    }
    return campaign;
  }

  /** Any participant (owner, master or player) may open the campaign. */
  async findForMemberOrFail(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.findByIdOrFail(id);
    if (!(await this.participants.exists(id, userId))) {
      throw new ForbiddenException('Você não participa desta campanha');
    }
    return campaign;
  }

  /**
   * Guards narrative/playable configuration (factions, attributes, …). Only the
   * CURRENT master may write — the owner passes only when they are also the
   * master. This is the single source of truth for that rule; services call it
   * instead of re-checking `ownerId`/`masterId` themselves.
   */
  async findForMasterOrFail(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.findByIdOrFail(id);
    if (campaign.masterId !== userId) {
      throw new ForbiddenException(
        'Apenas o mestre da campanha pode realizar esta ação.',
      );
    }
    return campaign;
  }

  /** Persists a new master for the campaign. Authorization is the caller's job. */
  async updateMaster(campaign: Campaign, masterId: string): Promise<Campaign> {
    campaign.masterId = masterId;
    return this.campaigns.save(campaign);
  }

  /** Persists the campaign's character art direction. Authorization is the caller's job. */
  async saveCharacterArtDirection(
    campaign: Campaign,
    value: string,
  ): Promise<Campaign> {
    campaign.characterArtDirection = value;
    return this.campaigns.save(campaign);
  }
}
