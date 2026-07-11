import { MapDto } from '@modules/maps/dto/map.dto';
import { CampaignSession } from '../entities/campaign-session.entity';

/**
 * Response shape for a campaign session. `map` is the current map as the viewer
 * is allowed to see it (masters get private fields); it is present on start and
 * on the active-session fetch so the session screen can render immediately.
 */
export interface SessionDto {
  id: string;
  campaignId: string;
  status: string;
  startedByUserId: string;
  initialMapId: string;
  currentMapId: string;
  startedAt: Date;
  endedAt: Date | null;
  map: MapDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSessionDto(
  session: CampaignSession,
  map: MapDto | null = null,
): SessionDto {
  return {
    id: session.id,
    campaignId: session.campaignId,
    status: session.status,
    startedByUserId: session.startedByUserId,
    initialMapId: session.initialMapId,
    currentMapId: session.currentMapId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    map,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
