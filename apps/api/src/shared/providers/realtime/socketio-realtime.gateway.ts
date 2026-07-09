import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeProvider } from './realtime.provider';

/** Only these room namespaces may be joined. */
const ALLOWED_ROOM_PREFIXES = ['faction:', 'campaign:', 'character:', 'map:'];

function isAllowedRoom(room: unknown): room is string {
  return (
    typeof room === 'string' &&
    room.length <= 120 &&
    ALLOWED_ROOM_PREFIXES.some((p) => room.startsWith(p))
  );
}

/**
 * Socket.IO adapter for {@link RealtimeProvider}. The ONLY file that knows about
 * Socket.IO — domain code emits through the RealtimeProvider port, so the
 * transport can be swapped (e.g. Kafka bridge) without touching business rules.
 *
 * Clients join rooms by emitting `join` / `leave` with a room name such as
 * `faction:{id}` or `campaign:{id}`.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class SocketIoRealtimeGateway implements RealtimeProvider {
  private readonly logger = new Logger(SocketIoRealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage('join')
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: unknown,
  ): void {
    if (isAllowedRoom(room)) {
      client.join(room);
    }
  }

  @SubscribeMessage('leave')
  onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: unknown,
  ): void {
    if (isAllowedRoom(room)) {
      client.leave(room);
    }
  }

  async emitToRoom<TPayload>(
    room: string,
    event: string,
    payload: TPayload,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn(`Socket server not ready; dropped "${event}"`);
      return;
    }
    this.server.to(room).emit(event, payload);
  }

  async emitToClient<TPayload>(
    clientId: string,
    event: string,
    payload: TPayload,
  ): Promise<void> {
    if (!this.server) return;
    this.server.to(clientId).emit(event, payload);
  }
}
