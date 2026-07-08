import { Faction } from '../entities/faction.entity';
import { FactionImage } from '../entities/faction-image.entity';

export interface FactionImageDto {
  id: string;
  imageUrl: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  notes: string | null;
  status: string;
  errorMessage: string | null;
  isApproved: boolean;
  createdAt: Date;
}

export interface FactionDto {
  id: string;
  campaignId: string;
  name: string;
  type: string;
  description: string;
  history: string;
  identity: string;
  memberTraits: string;
  values: string;
  motto: string;
  colors: string;
  recurringElements: string;
  symbolType: string;
  symbolPrompt: string;
  approvedImageUrl: string | null;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Most recent image (queued/processing/completed/failed…). */
  currentImage?: FactionImageDto;
  /** Full history, present on the detail view. */
  images?: FactionImageDto[];
}

export function toFactionImageDto(image: FactionImage): FactionImageDto {
  return {
    id: image.id,
    imageUrl: image.imageUrl,
    prompt: image.prompt,
    negativePrompt: image.negativePrompt,
    notes: image.notes,
    status: image.status,
    errorMessage: image.errorMessage,
    isApproved: image.isApproved,
    createdAt: image.createdAt,
  };
}

/**
 * `images` should be ordered newest-first; `images[0]` becomes `currentImage`.
 */
export function toFactionDto(
  faction: Faction,
  images?: FactionImage[],
): FactionDto {
  return {
    id: faction.id,
    campaignId: faction.campaignId,
    name: faction.name,
    type: faction.type,
    description: faction.description,
    history: faction.history,
    identity: faction.identity,
    memberTraits: faction.memberTraits,
    values: faction.values,
    motto: faction.motto,
    colors: faction.colors,
    recurringElements: faction.recurringElements,
    symbolType: faction.symbolType,
    symbolPrompt: faction.symbolPrompt,
    approvedImageUrl: faction.approvedImageUrl,
    status: faction.status,
    createdBy: faction.createdBy,
    createdAt: faction.createdAt,
    updatedAt: faction.updatedAt,
    currentImage: images && images[0] ? toFactionImageDto(images[0]) : undefined,
    images: images?.map(toFactionImageDto),
  };
}
