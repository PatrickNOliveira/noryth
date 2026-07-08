/**
 * PresenceProvider — PORT for per-campaign online presence.
 *
 * Domain code depends on this interface and the {@link PRESENCE_PROVIDER} token
 * only — never on Redis or an in-memory map. Presence is ephemeral (not
 * persisted): today an in-memory adapter, tomorrow a Redis adapter for
 * multi-instance deployments, without touching business rules.
 *
 * A "connection" is a single realtime socket. A user is online in a campaign
 * while they hold at least one connection joined to it, so transitions
 * (offline→online / online→offline) are reported to let callers broadcast only
 * on real state changes.
 */
export interface PresenceTransition {
  /** True when this call flipped the user's state (so callers emit an event). */
  transitioned: boolean;
}

export interface ConnectionDrop {
  campaignId: string;
  userId: string;
  /** True when the user has no remaining connections in that campaign. */
  transitioned: boolean;
}

export interface PresenceProvider {
  /** Registers a connection for a user in a campaign. */
  markOnline(
    campaignId: string,
    userId: string,
    connectionId: string,
  ): PresenceTransition;
  /** Removes one connection of a user from a campaign. */
  markOffline(
    campaignId: string,
    userId: string,
    connectionId: string,
  ): PresenceTransition;
  /** Removes a connection from every campaign (used on socket disconnect). */
  removeConnection(connectionId: string): ConnectionDrop[];
  /** Distinct user ids currently online in the campaign. */
  getOnlineUserIds(campaignId: string): string[];
}

/** DI token used to inject a {@link PresenceProvider}. */
export const PRESENCE_PROVIDER = Symbol('PRESENCE_PROVIDER');
