import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Faction } from '../entities/faction.entity';
import { FactionImage } from '../entities/faction-image.entity';
import { FactionsRepository } from './factions.repository';

/** TypeORM adapter for {@link FactionsRepository}. */
@Injectable()
export class TypeOrmFactionsRepository implements FactionsRepository {
  constructor(
    @InjectRepository(Faction)
    private readonly factions: Repository<Faction>,
    @InjectRepository(FactionImage)
    private readonly images: Repository<FactionImage>,
  ) {}

  createFaction(data: Partial<Faction>): Faction {
    return this.factions.create(data as DeepPartial<Faction>);
  }

  saveFaction(faction: Faction): Promise<Faction> {
    return this.factions.save(faction);
  }

  findFactionById(id: string): Promise<Faction | null> {
    return this.factions.findOne({ where: { id } });
  }

  findByCampaign(campaignId: string): Promise<Faction[]> {
    return this.factions.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }

  createImage(data: Partial<FactionImage>): FactionImage {
    return this.images.create(data as DeepPartial<FactionImage>);
  }

  saveImage(image: FactionImage): Promise<FactionImage> {
    return this.images.save(image);
  }

  findImagesByFaction(factionId: string): Promise<FactionImage[]> {
    return this.images.find({
      where: { factionId },
      order: { createdAt: 'DESC' },
    });
  }

  findLatestImage(factionId: string): Promise<FactionImage | null> {
    return this.images.findOne({
      where: { factionId },
      order: { createdAt: 'DESC' },
    });
  }

  async unapproveAllImages(factionId: string): Promise<void> {
    await this.images.update({ factionId }, { isApproved: false });
  }
}
