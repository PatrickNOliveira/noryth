import { CharacterForm } from '../entities/character-form.entity';
import { CharacterFormAttributeValue } from '../entities/character-form-attribute-value.entity';
import { CharacterFormAbility } from '../entities/character-form-ability.entity';

export interface FormAttributeValueDto {
  attributeId: string;
  value: number;
}
export interface FormAbilityDto {
  abilityDefinitionId: string;
  isVisibleToPlayers: boolean;
}

export interface CharacterFormDto {
  id: string;
  campaignId: string;
  characterId: string;
  name: string;
  shortDescription: string;
  appearanceDescription: string;
  notes: string;
  isDefault: boolean;
  isActive: boolean;
  usesBaseAbilities: boolean;
  imageUrl: string | null;
  imageStatus: string;
  imageError: string | null;
  attributes: FormAttributeValueDto[];
  abilities: FormAbilityDto[];
  createdAt: Date;
  updatedAt: Date;
}

export function toCharacterFormDto(
  form: CharacterForm,
  values: CharacterFormAttributeValue[],
  abilities: CharacterFormAbility[],
): CharacterFormDto {
  return {
    id: form.id,
    campaignId: form.campaignId,
    characterId: form.characterId,
    name: form.name,
    shortDescription: form.shortDescription,
    appearanceDescription: form.appearanceDescription,
    notes: form.notes,
    isDefault: form.isDefault,
    isActive: form.isActive,
    usesBaseAbilities: form.usesBaseAbilities,
    imageUrl: form.imageUrl,
    imageStatus: form.imageStatus,
    imageError: form.imageError,
    attributes: values.map((v) => ({ attributeId: v.attributeId, value: v.value })),
    abilities: abilities.map((a) => ({
      abilityDefinitionId: a.abilityDefinitionId,
      isVisibleToPlayers: a.isVisibleToPlayers,
    })),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}
