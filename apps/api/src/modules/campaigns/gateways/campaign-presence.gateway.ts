import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CampaignPresenceService } from '../services/campaign-presence.service';
import {
  CAMPAIGN_PRESENCE_EVENTS,
  CAMPAIGN_PRESENCE_MESSAGES,
  campaignRoom,
} from '../campaign.constants';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Socket.IO gateway for campaign presence. The ONLY presence file that knows
 * Socket.IO: it authenticates the socket (JWT from the handshake), then delegates
 * WHO-may-be-present and state bookkeeping to {@link CampaignPresenceService},
 * doing only the transport (join room, emit events).
 *
 * It shares the single Socket.IO server with SocketIoRealtimeGateway; the two
 * cooperate by using distinct message/event names.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class CampaignPresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CampaignPresenceGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly presence: CampaignPresenceService,
    private readonly jwt: JwtService,
  ) {}

  /** Identify the socket's user from the handshake token (best-effort). */
  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      client.data.userId = payload.sub;
    } catch {
      // Unauthenticated sockets stay connected (e.g. for non-presence events),
      // but cannot register presence.
    }
  }

  handleDisconnect(client: Socket): void {
    const drops = this.presence.disconnect(client.id);
    for (const drop of drops) {
      if (!drop.transitioned) continue;
      this.server
        .to(campaignRoom(drop.campaignId))
        .emit(CAMPAIGN_PRESENCE_EVENTS.offline, {
          campaignId: drop.campaignId,
          userId: drop.userId,
        });
    }
  }

  @SubscribeMessage(CAMPAIGN_PRESENCE_MESSAGES.join)
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() campaignId: unknown,
  ): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId || !this.isUuid(campaignId)) return;

    const result = await this.presence.join(userId, campaignId, client.id);
    if (!result.allowed) return;

    const room = campaignRoom(campaignId);
    await client.join(room);

    // Snapshot to the joiner…
    client.emit(CAMPAIGN_PRESENCE_EVENTS.snapshot, {
      campaignId,
      onlineUserIds: result.onlineUserIds,
    });
    // …and announce to the others only on a real offline→online transition.
    if (result.broadcastOnline) {
      client.to(room).emit(CAMPAIGN_PRESENCE_EVENTS.online, {
        campaignId,
        userId,
      });
    }
  }

  @SubscribeMessage(CAMPAIGN_PRESENCE_MESSAGES.leave)
  onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() campaignId: unknown,
  ): void {
    const userId = client.data.userId as string | undefined;
    if (!userId || !this.isUuid(campaignId)) return;

    const { broadcastOffline } = this.presence.leave(
      userId,
      campaignId,
      client.id,
    );
    const room = campaignRoom(campaignId);
    void client.leave(room);
    if (broadcastOffline) {
      client.to(room).emit(CAMPAIGN_PRESENCE_EVENTS.offline, {
        campaignId,
        userId,
      });
    }
  }

  private isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
  }
}
