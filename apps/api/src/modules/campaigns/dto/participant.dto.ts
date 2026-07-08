import { User } from '@modules/users/entities/user.entity';
import { CampaignParticipant } from '../entities/campaign-participant.entity';
import { ParticipantRole, participantRole } from '../campaign.constants';

/** Public view of a campaign participant, with derived role + presence. */
export interface ParticipantDto {
  userId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  isOwner: boolean;
  isMaster: boolean;
  isPlayer: boolean;
  online: boolean;
  joinedAt: Date;
}

export function toParticipantDto(
  participant: CampaignParticipant,
  user: Pick<User, 'id' | 'name' | 'email'> | undefined,
  ownerId: string,
  masterId: string,
  online: boolean,
): ParticipantDto {
  const isOwner = participant.userId === ownerId;
  const isMaster = participant.userId === masterId;
  return {
    userId: participant.userId,
    name: user?.name ?? 'Usuário',
    email: user?.email ?? '',
    role: participantRole(participant.userId, ownerId, masterId),
    isOwner,
    isMaster,
    isPlayer: !isOwner && !isMaster,
    online,
    joinedAt: participant.joinedAt,
  };
}
