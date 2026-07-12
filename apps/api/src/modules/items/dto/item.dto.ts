import { ItemDefinition } from '../entities/item-definition.entity';
import { ItemInstance } from '../entities/item-instance.entity';

export interface ItemDefinitionDto {
  id: string;
  campaignId: string;
  createdByUserId: string;
  creationSource: string;
  createdDuringSessionId: string | null;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  effectDescription: string;
  rulesText: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
  /** Master-only; null for players. */
  masterNotes: string | null;
  imageUrl: string | null;
  imageStatus: string;
  imageError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemInstanceDto {
  id: string;
  campaignId: string;
  itemDefinitionId: string;
  customName: string | null;
  customDescription: string | null;
  quantity: number;
  state: string;
  isVisibleToPlayers: boolean;
  discoveredAt: Date | null;
  holderCharacterId: string | null;
  mapId: string | null;
  mapPointOfInterestId: string | null;
  /** Master-only; null for players. */
  masterNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A definition plus how many instances of it exist (session items list). */
export interface ItemDefinitionListItemDto extends ItemDefinitionDto {
  instanceCount: number;
}

/** A definition with all its instances (session item sheet). */
export interface ItemSessionDetailDto {
  definition: ItemDefinitionDto;
  instances: ItemInstanceDto[];
}

export function toItemDefinitionDto(
  def: ItemDefinition,
  includePrivate: boolean,
): ItemDefinitionDto {
  return {
    id: def.id,
    campaignId: def.campaignId,
    createdByUserId: def.createdByUserId,
    creationSource: def.creationSource,
    createdDuringSessionId: def.createdDuringSessionId,
    name: def.name,
    type: def.type,
    shortDescription: def.shortDescription,
    description: def.description,
    history: def.history,
    appearance: def.appearance,
    effectDescription: def.effectDescription,
    rulesText: def.rulesText,
    isUnique: def.isUnique,
    isVisibleToPlayers: def.isVisibleToPlayers,
    masterNotes: includePrivate ? def.masterNotes : null,
    imageUrl: def.imageUrl,
    imageStatus: def.imageStatus,
    imageError: def.imageError,
    createdAt: def.createdAt,
    updatedAt: def.updatedAt,
  };
}

export function toItemInstanceDto(
  instance: ItemInstance,
  includePrivate: boolean,
): ItemInstanceDto {
  return {
    id: instance.id,
    campaignId: instance.campaignId,
    itemDefinitionId: instance.itemDefinitionId,
    customName: instance.customName,
    customDescription: instance.customDescription,
    quantity: instance.quantity,
    state: instance.state,
    isVisibleToPlayers: instance.isVisibleToPlayers,
    discoveredAt: instance.discoveredAt,
    holderCharacterId: instance.holderCharacterId,
    mapId: instance.mapId,
    mapPointOfInterestId: instance.mapPointOfInterestId,
    masterNotes: includePrivate ? instance.masterNotes : null,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  };
}
