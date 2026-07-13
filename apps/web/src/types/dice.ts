/** Dice supported this story (single type per roll, N identical dice). */
export const DICE_TYPES = ['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D20'] as const;
export type DiceType = (typeof DICE_TYPES)[number];

/** Side count per die type, mirrored from the backend. */
export const DICE_SIDES: Record<DiceType, number> = {
  D2: 2,
  D4: 4,
  D6: 6,
  D8: 8,
  D10: 10,
  D12: 12,
  D20: 20,
};

export const DICE_QUANTITY_MIN = 1;
export const DICE_QUANTITY_MAX = 50;

/** Max dice rendered as individual cards; the rest fall back to a text list. */
export const DICE_MAX_VISIBLE = 10;

export type DiceVisibility = 'PUBLIC' | 'SECRET';

/** A completed dice roll (result comes from the backend — never computed here). */
export interface DiceRoll {
  id: string;
  tableId: string;
  sessionId: string;
  diceType: DiceType;
  sides: number;
  quantity: number;
  results: number[];
  total: number;
  visibility: DiceVisibility;
  rolledByUserId: string;
  rolledByName: string;
  clientMutationId: string | null;
  createdAt: string;
}

export interface RollDiceInput {
  diceType: DiceType;
  quantity: number;
  visibility: DiceVisibility;
  clientMutationId?: string;
}
