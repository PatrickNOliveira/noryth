import { io, Socket } from 'socket.io-client';
import { runtimeConfig } from '../config/runtimeConfig';

/**
 * Thin realtime abstraction over Socket.IO. Screens/hooks use `join`, `on` and
 * `off` and never import socket.io-client directly — so the transport can be
 * swapped later without touching feature code. A single shared connection is
 * lazily created and reused.
 */
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(runtimeConfig.socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
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
