import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { ItemDefinition } from '../entities/item-definition.entity';
import { ItemInstance } from '../entities/item-instance.entity';
import { InstanceFilters, ItemsRepository } from './items.repository';

/** TypeORM adapter for {@link ItemsRepository}. */
@Injectable()
export class TypeOrmItemsRepository implements ItemsRepository {
  constructor(
    @InjectRepository(ItemDefinition)
    private readonly definitions: Repository<ItemDefinition>,
    @InjectRepository(ItemInstance)
    private readonly instances: Repository<ItemInstance>,
  ) {}

  createDefinition(data: Partial<ItemDefinition>): ItemDefinition {
    return this.definitions.create(data as DeepPartial<ItemDefinition>);
  }

  saveDefinition(def: ItemDefinition): Promise<ItemDefinition> {
    return this.definitions.save(def);
  }

  async removeDefinition(def: ItemDefinition): Promise<void> {
    await this.definitions.remove(def);
  }

  findDefinitionById(id: string): Promise<ItemDefinition | null> {
    return this.definitions.findOne({ where: { id } });
  }

  findDefinitionsByCampaign(campaignId: string): Promise<ItemDefinition[]> {
    return this.definitions.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }

  findVisibleDefinitionsByCampaign(campaignId: string): Promise<ItemDefinition[]> {
    return this.definitions.find({
      where: { campaignId, isVisibleToPlayers: true },
      order: { createdAt: 'DESC' },
    });
  }

  countInstancesOfDefinition(definitionId: string): Promise<number> {
    return this.instances.countBy({ itemDefinitionId: definitionId });
  }

  createInstance(data: Partial<ItemInstance>): ItemInstance {
    return this.instances.create(data as DeepPartial<ItemInstance>);
  }

  saveInstance(instance: ItemInstance): Promise<ItemInstance> {
    return this.instances.save(instance);
  }

  async removeInstance(instance: ItemInstance): Promise<void> {
    await this.instances.remove(instance);
  }

  findInstanceById(id: string): Promise<ItemInstance | null> {
    return this.instances.findOne({ where: { id } });
  }

  findInstances(
    campaignId: string,
    filters: InstanceFilters,
  ): Promise<ItemInstance[]> {
    const where: FindOptionsWhere<ItemInstance> = { campaignId };
    if (filters.itemDefinitionId) where.itemDefinitionId = filters.itemDefinitionId;
    if (filters.holderCharacterId) where.holderCharacterId = filters.holderCharacterId;
    if (filters.mapId) where.mapId = filters.mapId;
    if (filters.mapPointOfInterestId) {
      where.mapPointOfInterestId = filters.mapPointOfInterestId;
    }
    if (filters.visibleOnly) where.isVisibleToPlayers = true;
    return this.instances.find({ where, order: { createdAt: 'DESC' } });
  }
}
