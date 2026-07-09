import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CampaignMap } from '../entities/campaign-map.entity';
import { MapPoint } from '../entities/map-point.entity';
import { MapsRepository } from './maps.repository';

/** TypeORM adapter for {@link MapsRepository}. */
@Injectable()
export class TypeOrmMapsRepository implements MapsRepository {
  constructor(
    @InjectRepository(CampaignMap)
    private readonly maps: Repository<CampaignMap>,
    @InjectRepository(MapPoint)
    private readonly points: Repository<MapPoint>,
  ) {}

  createMap(data: Partial<CampaignMap>): CampaignMap {
    return this.maps.create(data as DeepPartial<CampaignMap>);
  }

  saveMap(map: CampaignMap): Promise<CampaignMap> {
    return this.maps.save(map);
  }

  async removeMap(map: CampaignMap): Promise<void> {
    await this.points.delete({ mapId: map.id });
    await this.maps.remove(map);
  }

  findMapById(id: string): Promise<CampaignMap | null> {
    return this.maps.findOne({ where: { id } });
  }

  findByCampaign(campaignId: string): Promise<CampaignMap[]> {
    return this.maps.find({
      where: { campaignId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  findVisibleByCampaign(campaignId: string): Promise<CampaignMap[]> {
    return this.maps.find({
      where: { campaignId, isVisibleToPlayers: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  countChildren(mapId: string): Promise<number> {
    return this.maps.countBy({ parentMapId: mapId });
  }

  createPoint(data: Partial<MapPoint>): MapPoint {
    return this.points.create(data as DeepPartial<MapPoint>);
  }

  savePoint(point: MapPoint): Promise<MapPoint> {
    return this.points.save(point);
  }

  async removePoint(point: MapPoint): Promise<void> {
    await this.points.remove(point);
  }

  findPointById(id: string): Promise<MapPoint | null> {
    return this.points.findOne({ where: { id } });
  }

  findPointsByMap(mapId: string): Promise<MapPoint[]> {
    return this.points.find({
      where: { mapId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  findVisiblePointsByMap(mapId: string): Promise<MapPoint[]> {
    return this.points.find({
      where: { mapId, isVisibleToPlayers: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }
}
