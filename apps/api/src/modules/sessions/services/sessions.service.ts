import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { MapsService } from '@modules/maps/services/maps.service';
import { toMapDto } from '@modules/maps/dto/map.dto';
import { CampaignSession } from '../entities/campaign-session.entity';
import { SessionDto, toSessionDto } from '../dto/session.dto';
import { StartSessionDto } from '../dto/start-session.dto';
import { ChangeMapDto, ChangeMapResultDto } from '../dto/change-map.dto';
import { SESSION_EVENTS } from '../session.constants';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import {
  SESSION_CHARACTERS_REPOSITORY,
  SessionCharactersRepository,
} from '../repositories/session-characters.repository';

/**
 * Application service for campaign sessions. Only the current master may start a
 * session; any participant may read the active one. A campaign has at most one
 * ACTIVE session — starting again returns the existing one instead of creating a
 * duplicate. Realtime is via the port only; no Socket.IO/Redis here.
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    @Inject(SESSION_CHARACTERS_REPOSITORY)
    private readonly sessionChars: SessionCharactersRepository,
    private readonly campaigns: CampaignsService,
    private readonly maps: MapsService,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  /**
   * Starts (or resumes) the campaign's active session. Master only. If one is
   * already active, it is returned as-is — no duplicate, no error — so the caller
   * simply lands on the running session.
   */
  async start(
    userId: string,
    campaignId: string,
    dto: StartSessionDto,
  ): Promise<SessionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);

    const existing = await this.sessions.findActiveByCampaign(campaignId);
    if (existing) {
      // Already in progress — take the master to it rather than duplicating.
      // Still make sure the current map has its 2.5D scene (or is generating it).
      await this.maps.ensureSessionScene(campaignId, existing.currentMapId, userId);
      return this.withMap(existing, userId);
    }

    const map = await this.maps.findMapInCampaign(campaignId, dto.initialMapId);
    if (!map) {
      throw new BadRequestException(
        'O mapa inicial precisa pertencer a esta campanha.',
      );
    }

    const session = await this.sessions.save(
      this.sessions.create({
        campaignId,
        startedByUserId: userId,
        initialMapId: map.id,
        currentMapId: map.id,
        status: 'ACTIVE',
        startedAt: new Date(),
        endedAt: null,
      }),
    );

    await this.emitStarted(session);
    // Kick off the 2.5D session-scene generation without blocking the start.
    await this.maps.ensureSessionScene(campaignId, map.id, userId);
    return this.withMap(session, userId);
  }

  /**
   * The campaign's active session (with the current map), or null. Any
   * participant may read it — session visibility of the map is controlled here,
   * not by the map's own `isVisibleToPlayers` flag.
   */
  async getActive(
    userId: string,
    campaignId: string,
  ): Promise<SessionDto | null> {
    await this.campaigns.findForMemberOrFail(userId, campaignId);
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) return null;
    return this.withMap(session, userId);
  }

  /**
   * Switches the active session's map. Master only. Clears ALL placed characters
   * so the new map starts clean (this only removes the SessionCharacter links —
   * never the campaign characters), updates `currentMapId`, ensures the new map's
   * 2.5D scene, and broadcasts the change. If the target map equals the current
   * one, it is a no-op (returns the session, clears nothing).
   */
  async changeMap(
    userId: string,
    campaignId: string,
    dto: ChangeMapDto,
  ): Promise<ChangeMapResultDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) {
      throw new BadRequestException('Não há uma sessão ativa nesta campanha.');
    }

    if (dto.mapId === session.currentMapId) {
      const sameDto = await this.withMap(session, userId);
      return {
        session: sameDto,
        previousMapId: session.currentMapId,
        removedSessionCharacterIds: [],
      };
    }

    const map = await this.maps.findMapInCampaign(campaignId, dto.mapId);
    if (!map) {
      throw new BadRequestException('O mapa precisa pertencer a esta campanha.');
    }

    const previousMapId = session.currentMapId;
    // Clear the board first, then move the session to the new map.
    const removedSessionCharacterIds = await this.sessionChars.deleteBySession(
      session.id,
    );
    session.currentMapId = map.id;
    const saved = await this.sessions.save(session);

    // Build/keep the new map's 2.5D scene without blocking the switch.
    await this.maps.ensureSessionScene(campaignId, map.id, userId);

    const sessionDto = await this.withMap(saved, userId);
    await this.emitMapChanged(
      saved,
      previousMapId,
      removedSessionCharacterIds,
      sessionDto,
      userId,
    );
    return { session: sessionDto, previousMapId, removedSessionCharacterIds };
  }

  // ── helpers ─────────────────────────────────────────────────

  /** Loads the current map and builds the DTO honoring the viewer's role. */
  private async withMap(
    session: CampaignSession,
    userId: string,
  ): Promise<SessionDto> {
    const campaign = await this.campaigns.findByIdOrFail(session.campaignId);
    const isMaster = campaign.masterId === userId;
    const map = await this.maps.findMapInCampaign(
      session.campaignId,
      session.currentMapId,
    );
    if (!map) return toSessionDto(session, null);
    // The session decides visibility, so players see the map even if it is not
    // otherwise visible; only master-private fields (and hidden points) stay
    // gated by `isMaster`. Points feed the session viewport's markers.
    const points = await this.maps.findPointsForMap(map.id, isMaster);
    return toSessionDto(session, toMapDto(map, isMaster, points));
  }

  private async emitMapChanged(
    session: CampaignSession,
    previousMapId: string,
    removedSessionCharacterIds: string[],
    sessionDto: SessionDto,
    originUserId: string,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(
        campaignRoom(session.campaignId),
        SESSION_EVENTS.mapChanged,
        {
          tableId: session.campaignId,
          sessionId: session.id,
          previousMapId,
          currentMapId: session.currentMapId,
          removedSessionCharacterIds,
          sessionSceneImageUrl: sessionDto.map?.sessionSceneImageUrl ?? null,
          sessionSceneImageStatus: sessionDto.map?.sessionSceneImageStatus ?? null,
          originUserId,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Realtime emit "${SESSION_EVENTS.mapChanged}" failed: ${(error as Error).message}`,
      );
    }
  }

  private async emitStarted(session: CampaignSession): Promise<void> {
    try {
      await this.realtime.emitToRoom(
        campaignRoom(session.campaignId),
        SESSION_EVENTS.started,
        {
          tableId: session.campaignId,
          sessionId: session.id,
          currentMapId: session.currentMapId,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Realtime emit "${SESSION_EVENTS.started}" failed: ${(error as Error).message}`,
      );
    }
  }
}
