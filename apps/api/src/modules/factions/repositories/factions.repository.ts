import { Faction } from '../entities/faction.entity';
import { FactionImage } from '../entities/faction-image.entity';

/**
 * Persistence PORT for factions and their symbol images. The service depends on
 * this interface; the TypeORM adapter implements it.
 */
export interface FactionsRepository {
  createFaction(data: Partial<Faction>): Faction;
  saveFaction(faction: Faction): Promise<Faction>;
  findFactionById(id: string): Promise<Faction | null>;
  findByCampaign(campaignId: string): Promise<Faction[]>;

  createImage(data: Partial<FactionImage>): FactionImage;
  saveImage(image: FactionImage): Promise<FactionImage>;
  findImagesByFaction(factionId: string): Promise<FactionImage[]>;
  findLatestImage(factionId: string): Promise<FactionImage | null>;
  unapproveAllImages(factionId: string): Promise<void>;
}

/** DI token used to inject a {@link FactionsRepository}. */
export const FACTIONS_REPOSITORY = Symbol('FACTIONS_REPOSITORY');
