import { io, Socket } from 'socket.io-client';
import { runtimeConfig } from '../config/runtimeConfig';
import { store } from '../store';

/**
 * Thin realtime abstraction over Socket.IO. Screens/hooks use `join`, `on`,
 * `off` and `emit` and never import socket.io-client directly — so the transport
 * can be swapped later without touching feature code. A single shared connection
 * is lazily created and reused.
 *
 * The JWT is sent in the handshake (`auth.token`) as a function, so it is always
 * re-read on (re)connect — the backend identifies the user for presence.
 */
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(runtimeConfig.socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      auth: (cb) => cb({ token: store.getState().auth.token ?? '' }),
    });
  }
  return socket;
}

type Handler = (payload: unknown) => void;

export const realtime = {
  /** Join a room (e.g. `faction:{id}` or `campaign:{id}`). */
  join(room: string): void {
    getSocket().emit('join', room);
  },
  leave(room: string): void {
    getSocket().emit('leave', room);
  },
  emit(event: string, payload: unknown): void {
    getSocket().emit(event, payload);
  },
  on(event: string, handler: Handler): void {
    getSocket().on(event, handler);
  },
  off(event: string, handler: Handler): void {
    getSocket().off(event, handler);
  },
};

/** Event names emitted by the API for faction symbol generation. */
export const FACTION_IMAGE_EVENTS = {
  processing: 'faction.image.processing',
  completed: 'faction.image.completed',
  failed: 'faction.image.failed',
} as const;

/** Event names emitted by the API for character portrait generation. */
export const CHARACTER_IMAGE_EVENTS = {
  processing: 'character.image.processing',
  completed: 'character.image.completed',
  failed: 'character.image.failed',
} as const;

/** Event names emitted by the API for map image generation. */
export const MAP_IMAGE_EVENTS = {
  processing: 'map.image.processing',
  completed: 'map.image.completed',
  failed: 'map.image.failed',
} as const;

/** Client → server messages for campaign presence. */
export const CAMPAIGN_PRESENCE_MESSAGES = {
  join: 'campaign:presence:join',
  leave: 'campaign:presence:leave',
} as const;

/** Server → client presence events. */
export const CAMPAIGN_PRESENCE_EVENTS = {
  online: 'campaign.participant.online',
  offline: 'campaign.participant.offline',
  snapshot: 'campaign.participants.presence',
} as const;
