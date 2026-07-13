import { DiceType, DiceVisibility } from '../dice.constants';

/**
 * Result of a dice roll — returned to the caller and, for PUBLIC rolls, used
 * verbatim as the realtime payload. `results` are the individual dice and `total`
 * their sum; both come from the backend. SECRET rolls never leave the HTTP
 * response, so this shape is safe to broadcast only when `visibility === PUBLIC`.
 */
export interface SessionDiceRollDto {
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
