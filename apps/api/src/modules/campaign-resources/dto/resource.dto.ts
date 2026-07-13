import { CampaignResourceDefinition } from '../entities/campaign-resource-definition.entity';

/** Public view of a campaign resource definition. */
export interface ResourceDefinitionDto {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  type: string;
  minValue: number;
  defaultMaxValue: number;
  defaultCurrentValueStrategy: string;
  defaultCurrentValue: number | null;
  isVisibleToPlayers: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toResourceDefinitionDto(
  def: CampaignResourceDefinition,
): ResourceDefinitionDto {
  return {
    id: def.id,
    campaignId: def.campaignId,
    name: def.name,
    description: def.description,
    type: def.type,
    minValue: def.minValue,
    defaultMaxValue: def.defaultMaxValue,
    defaultCurrentValueStrategy: def.defaultCurrentValueStrategy,
    defaultCurrentValue: def.defaultCurrentValue,
    isVisibleToPlayers: def.isVisibleToPlayers,
    displayOrder: def.displayOrder,
    createdAt: def.createdAt,
    updatedAt: def.updatedAt,
  };
}
