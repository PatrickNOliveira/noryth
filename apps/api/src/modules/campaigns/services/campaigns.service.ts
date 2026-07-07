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

  findMine(userId: string): Promise<Campaign[]> {
    return this.campaigns.findByOwner(userId);
  }

  async findOwnedOrFail(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }
    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('Você não tem acesso a esta campanha');
    }
    return campaign;
  }
}
