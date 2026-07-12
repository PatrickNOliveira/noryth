/**
 * A campaign session is a live play instance of the table. This first story only
 * needs the "active" concept: the master starts one, picks an initial map, and
 * everyone is taken to the session screen. Future stories may add PAUSED/ENDED.
 */

/** Session lifecycle. For now only ACTIVE is ever set. */
export const SESSION_STATUSES = ['ACTIVE', 'ENDED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** Server → client events for the session lifecycle (emitted to the campaign room). */
export const SESSION_EVENTS = {
  started: 'campaign.session.started',
  mapChanged: 'session.map.changed',
  ended: 'session.ended',
} as const;
