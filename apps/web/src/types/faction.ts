export type FactionSymbolType = 'coat_of_arms' | 'banner';
export type FactionStatus =
  | 'draft'
  | 'generating_symbol'
  | 'pending_approval'
  | 'active'
  | 'generation_failed'
  | 'archived';
export type FactionImageStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'approved'
  | 'rejected';

export interface FactionImage {
  id: string;
  imageUrl: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  notes: string | null;
  status: FactionImageStatus;
  errorMessage: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface Faction {
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
  symbolType: FactionSymbolType;
  symbolPrompt: string;
  approvedImageUrl: string | null;
  status: FactionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentImage?: FactionImage;
  images?: FactionImage[];
}

export interface CreateFactionInput {
  name: string;
  type: string;
  customType?: string;
  description?: string;
  history?: string;
  identity?: string;
  memberTraits?: string;
  values?: string;
  motto?: string;
  colors?: string;
  recurringElements?: string;
  symbolType: FactionSymbolType;
  symbolPrompt?: string;
}
