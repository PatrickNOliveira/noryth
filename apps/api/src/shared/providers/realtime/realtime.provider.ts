/**
 * RealtimeProvider — PORT for real-time messaging.
 *
 * The concrete adapter (Socket.IO) will be implemented in a future story and
 * bound to {@link REALTIME_PROVIDER}. Domain code emits through this port only.
 */
export interface RealtimeProvider {
  /** Emits an event with a payload to everyone in a room/channel. */
  emitToRoom<TPayload>(room: string, event: string, payload: TPayload): Promise<void>;
  /** Emits an event with a payload to a single connection. */
  emitToClient<TPayload>(clientId: string, event: string, payload: TPayload): Promise<void>;
}

/** DI token used to inject a {@link RealtimeProvider}. */
export const REALTIME_PROVIDER = Symbol('REALTIME_PROVIDER');
