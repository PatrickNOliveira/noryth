import { Inject, Injectable } from '@nestjs/common';
import {
  ConnectionDrop,
  PRESENCE_PROVIDER,
  PresenceProvider,
} from '@shared/providers/presence/presence.provider';
import {
  CAMPAIGN_PARTICIPANTS_REPOSITORY,
  CampaignParticipantsRepository,
} from '../repositories/campaign-participants.repository';

export interface PresenceJoinResult {
  /** False when the user is not a participant of the campaign. */
  allowed: boolean;
  /** True when the user just came online (emit an `online` event). */
  broadcastOnline: boolean;
  onlineUserIds: string[];
}

/**
 * Domain orchestration for campaign presence. It decides WHO may be present
 * (membership) and updates the {@link PresenceProvider}, but never touches
 * Socket.IO — it returns instructions and the gateway does the transport.
 */
@Injectable()
export class CampaignPresenceService {
  constructor(
    @Inject(PRESENCE_PROVIDER)
    private readonly presence: PresenceProvider,
    @Inject(CAMPAIGN_PARTICIPANTS_REPOSITORY)
    private readonly participants: CampaignParticipantsRepository,
  ) {}

  async join(
    userId: string,
    campaignId: string,
    connectionId: string,
  ): Promise<PresenceJoinResult> {
    const isMember = await this.participants.exists(campaignId, userId);
    if (!isMember) {
      return { allowed: false, broadcastOnline: false, onlineUserIds: [] };
    }
    const { transitioned } = this.presence.markOnline(
      campaignId,
      userId,
      connectionId,
    );
    return {
      allowed: true,
      broadcastOnline: transitioned,
      onlineUserIds: this.presence.getOnlineUserIds(campaignId),
    };
  }

  leave(
    userId: string,
    campaignId: string,
    connectionId: string,
  ): { broadcastOffline: boolean } {
    const { transitioned } = this.presence.markOffline(
      campaignId,
      userId,
      connectionId,
    );
    return { broadcastOffline: transitioned };
  }

  /** Handles a dropped socket: returns which (campaign,user) went fully offline. */
  disconnect(connectionId: string): ConnectionDrop[] {
    return this.presence.removeConnection(connectionId);
  }
}
