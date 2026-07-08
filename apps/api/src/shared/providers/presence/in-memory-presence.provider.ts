import { Injectable } from '@nestjs/common';
import {
  ConnectionDrop,
  PresenceProvider,
  PresenceTransition,
} from './presence.provider';

interface ConnectionState {
  userId: string;
  campaigns: Set<string>;
}

/**
 * In-memory {@link PresenceProvider}. Fine for a single API instance (current
 * dev/deploy). For horizontal scaling, swap the binding for a Redis-backed
 * adapter — no domain code changes, since callers depend on the port.
 *
 * State:
 *   byCampaign:    campaignId → userId → set of connectionIds
 *   byConnection:  connectionId → { userId, campaigns }
 */
@Injectable()
export class InMemoryPresenceProvider implements PresenceProvider {
  private readonly byCampaign = new Map<string, Map<string, Set<string>>>();
  private readonly byConnection = new Map<string, ConnectionState>();

  markOnline(
    campaignId: string,
    userId: string,
    connectionId: string,
  ): PresenceTransition {
    let users = this.byCampaign.get(campaignId);
    if (!users) {
      users = new Map();
      this.byCampaign.set(campaignId, users);
    }
    let connections = users.get(userId);
    const transitioned = !connections || connections.size === 0;
    if (!connections) {
      connections = new Set();
      users.set(userId, connections);
    }
    connections.add(connectionId);

    let conn = this.byConnection.get(connectionId);
    if (!conn) {
      conn = { userId, campaigns: new Set() };
      this.byConnection.set(connectionId, conn);
    }
    conn.campaigns.add(campaignId);

    return { transitioned };
  }

  markOffline(
    campaignId: string,
    userId: string,
    connectionId: string,
  ): PresenceTransition {
    const transitioned = this.detach(campaignId, userId, connectionId);
    const conn = this.byConnection.get(connectionId);
    if (conn) {
      conn.campaigns.delete(campaignId);
      if (conn.campaigns.size === 0) this.byConnection.delete(connectionId);
    }
    return { transitioned };
  }

  removeConnection(connectionId: string): ConnectionDrop[] {
    const conn = this.byConnection.get(connectionId);
    if (!conn) return [];
    this.byConnection.delete(connectionId);

    const drops: ConnectionDrop[] = [];
    for (const campaignId of conn.campaigns) {
      const transitioned = this.detach(campaignId, conn.userId, connectionId);
      drops.push({ campaignId, userId: conn.userId, transitioned });
    }
    return drops;
  }

  getOnlineUserIds(campaignId: string): string[] {
    const users = this.byCampaign.get(campaignId);
    if (!users) return [];
    return [...users.keys()];
  }

  /** Removes one connection; returns true when the user became fully offline. */
  private detach(
    campaignId: string,
    userId: string,
    connectionId: string,
  ): boolean {
    const users = this.byCampaign.get(campaignId);
    const connections = users?.get(userId);
    if (!connections) return false;
    connections.delete(connectionId);
    if (connections.size > 0) return false;
    users!.delete(userId);
    if (users!.size === 0) this.byCampaign.delete(campaignId);
    return true;
  }
}
