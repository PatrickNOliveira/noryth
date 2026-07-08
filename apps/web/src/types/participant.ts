export type ParticipantRole = 'OWNER_MASTER' | 'OWNER' | 'MASTER' | 'PLAYER';

/** A campaign participant with derived role and live presence. */
export interface Participant {
  userId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  isOwner: boolean;
  isMaster: boolean;
  isPlayer: boolean;
  online: boolean;
  joinedAt: string;
}
