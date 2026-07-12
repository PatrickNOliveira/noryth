import { ItemDefinition } from '../entities/item-definition.entity';
import { ItemInstance } from '../entities/item-instance.entity';

export interface InstanceFilters {
  itemDefinitionId?: string;
  holderCharacterId?: string;
  mapId?: string;
  mapPointOfInterestId?: string;
  /** When true, only instances visible to players. */
  visibleOnly?: boolean;
}

/**
 * Persistence PORT for item definitions and their instances. The service
 * depends on this interface; the TypeORM adapter implements it.
 */
export interface ItemsRepository {
  // ── definitions ──
  createDefinition(data: Partial<ItemDefinition>): ItemDefinition;
  saveDefinition(def: ItemDefinition): Promise<ItemDefinition>;
  removeDefinition(def: ItemDefinition): Promise<void>;
  findDefinitionById(id: string): Promise<ItemDefinition | null>;
  findDefinitionsByCampaign(campaignId: string): Promise<ItemDefinition[]>;
  findVisibleDefinitionsByCampaign(campaignId: string): Promise<ItemDefinition[]>;
  countInstancesOfDefinition(definitionId: string): Promise<number>;
  /** Instance counts per definition for a campaign, in one grouped query. */
  countInstancesByCampaign(
    campaignId: string,
  ): Promise<Array<{ itemDefinitionId: string; count: number }>>;

  // ── instances ──
  createInstance(data: Partial<ItemInstance>): ItemInstance;
  saveInstance(instance: ItemInstance): Promise<ItemInstance>;
  removeInstance(instance: ItemInstance): Promise<void>;
  findInstanceById(id: string): Promise<ItemInstance | null>;
  findInstances(
    campaignId: string,
    filters: InstanceFilters,
  ): Promise<ItemInstance[]>;
}

/** DI token used to inject an {@link ItemsRepository}. */
export const ITEMS_REPOSITORY = Symbol('ITEMS_REPOSITORY');
