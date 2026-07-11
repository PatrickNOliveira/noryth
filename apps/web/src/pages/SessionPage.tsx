import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, Loading, Alert, EmptyState, useToast } from '../components/ui';
import {
  BookIcon,
  MapIcon,
  CompassIcon,
  DiceIcon,
  ShieldIcon,
  LeaveIcon,
} from '../components/icons';
import { SessionGameViewport } from '../components/session/SessionGameViewport';
import {
  SessionActionMenu,
  SessionAction,
} from '../components/session/SessionActionMenu';
import { StartSessionModal } from '../components/session/StartSessionModal';
import { AddSessionCharacterModal } from '../components/session/AddSessionCharacterModal';
import { ChangeMapModal } from '../components/session/ChangeMapModal';
import { SessionCharacterControls } from '../components/session/SessionCharacterControls';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchActiveSession,
  clearSession,
  generateSessionScene,
  sessionSceneUpdate,
  setActiveSession,
  sessionMapSet,
  sessionPointMoved,
} from '../store/slices/session.slice';
import {
  fetchSessionCharacters,
  clearSessionCharacters,
  sessionCharacterAddedOptimistic,
  sessionCharacterConfirmed,
  sessionCharacterAddFailed,
  sessionCharacterPatched,
  sessionCharacterRestored,
  sessionCharacterMoved,
  sessionCharacterRemoved,
  sessionCharacterDragged,
  sessionCharacterSized,
  sessionSpriteUpdated,
} from '../store/slices/sessionCharacters.slice';
import { sessionService } from '../services/session.service';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';
import { useImageFallbackPoll } from '../hooks/useImageFallbackPoll';
import {
  realtime,
  MAP_SESSION_SCENE_EVENTS,
  SESSION_EVENTS,
  SESSION_CHARACTER_EVENTS,
  CHARACTER_SESSION_SPRITE_EVENTS,
  MAP_POINT_EVENTS,
} from '../services/realtime';
import { mapService } from '../services/map.service';
import { CampaignMap, MapImageStatus } from '../types/map';
import {
  SessionCharacter,
  SpriteDirection,
  SpriteImageStatus,
  SIZE_SCALE_DEFAULT,
} from '../types/session';
import { Character } from '../types/character';
import { media } from '../styles/media';

/** Full-viewport, no page scroll — this is a game screen, not an admin page. */
const Screen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
`;

const TopBar = styled.header`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Column on mobile (map over actions), row on desktop (rail beside map). */
const Main = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;

  ${media.tablet} {
    flex-direction: row;
  }
`;

/** Left rail — desktop only. */
const Sidebar = styled.aside`
  display: none;

  ${media.tablet} {
    display: flex;
    flex-direction: column;
    flex: 0 0 240px;
    min-height: 0;
    padding: ${({ theme }) => theme.spacing.md};
    border-right: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

/** Bottom action bar — mobile only; scrolls horizontally, never wraps. */
const BottomBar = styled.div`
  flex: 0 0 auto;
  padding: ${({ theme }) => theme.spacing.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  ${media.tablet} {
    display: none;
  }
`;

/** Centered state (loading / empty / error) inside the game screen. */
const Centered = styled.div`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

export function SessionPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { notify } = useToast();

  const { active, loaded, loading, error } = useAppSelector((s) => s.session);
  const { isMaster } = useCampaignMaster(campaignId);
  const campaignName = useAppSelector((s) => {
    const sel = s.campaigns.selectedCampaign;
    if (sel?.id === campaignId) return sel.name;
    return s.campaigns.myCampaigns.find((c) => c.id === campaignId)?.name;
  });
  const [startOpen, setStartOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAddIds, setPendingAddIds] = useState<string[]>([]);
  const [changeMapOpen, setChangeMapOpen] = useState(false);
  const [changingMap, setChangingMap] = useState(false);
  const [poiEditMode, setPoiEditMode] = useState(false);
  const pendingRemoveIds = useRef(new Set<string>());
  // POI move concurrency (optimistic drag + cancel + version guard) per pointId.
  const poiControllers = useRef(new Map<string, AbortController>());
  const poiVersions = useRef(new Map<string, number>());
  const poiDraggingIds = useRef(new Set<string>());
  const sessionCharacters = useAppSelector((s) => s.sessionCharacters.list);
  const myUserId = useAppSelector((s) => s.auth.user?.id);
  // Current map id, mirrored in a ref so realtime handlers can drop events that
  // belong to a map we already switched away from.
  const activeMapIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (campaignId) dispatch(fetchActiveSession(campaignId));
    return () => {
      dispatch(clearSession());
      dispatch(clearSessionCharacters());
    };
  }, [campaignId, dispatch]);

  const sceneMapId = active?.map?.id;
  const sceneStatus = active?.map?.sessionSceneImageStatus;
  const activeSessionId = active?.id;
  const currentMapId = active?.currentMapId;

  // Keep the current-map ref in sync so stale character events can be dropped.
  useEffect(() => {
    activeMapIdRef.current = currentMapId ?? null;
  }, [currentMapId]);

  // Load placed characters once a session is active (and after a map change).
  useEffect(() => {
    if (campaignId && activeSessionId) dispatch(fetchSessionCharacters(campaignId));
  }, [campaignId, activeSessionId, currentMapId, dispatch]);

  // Live character updates (session.character.* + character.session_sprite.*).
  useEffect(() => {
    if (!campaignId || !activeSessionId) return;
    const room = `campaign:${campaignId}`;
    const isOwnEcho = (originUserId?: string | null) =>
      !!originUserId && originUserId === myUserId;

    // Drop events that belong to a map we already switched away from.
    const isStaleMap = (mapId?: string | null) =>
      !!mapId && !!activeMapIdRef.current && mapId !== activeMapIdRef.current;

    const onAdded = (payload: unknown) => {
      const p = payload as {
        character?: SessionCharacter;
        originUserId?: string | null;
      };
      // The acting master already applied it optimistically — ignore own echo.
      if (isOwnEcho(p?.originUserId)) return;
      if (isStaleMap(p?.character?.mapId)) return;
      // Reconciles with any optimistic placeholder — never duplicates.
      if (p?.character) dispatch(sessionCharacterConfirmed(p.character));
    };
    const onMoved = (payload: unknown) => {
      const p = payload as {
        sessionCharacterId?: string;
        mapId?: string | null;
        x?: number;
        y?: number;
        facing?: SpriteDirection;
        sizeScale?: number;
        clientMutationId?: string | null;
        originUserId?: string | null;
      };
      const id = p?.sessionCharacterId;
      if (!id || p.x == null || p.y == null) return;
      // The acting master already applied it optimistically — ignore own echo.
      if (isOwnEcho(p.originUserId)) return;
      if (isStaleMap(p.mapId)) return;
      // Ignore any echo for a character this client is actively dragging.
      if (draggingIds.current.has(id)) return;
      // Ignore a stale echo: an event whose version is older than our latest
      // local mutation must not move/resize the token back. Events without a
      // clientMutationId (e.g. facing/visibility changes) are always applied.
      const localVersion = mutationVersions.current.get(id);
      if (
        localVersion != null &&
        p.clientMutationId != null &&
        Number(p.clientMutationId) < localVersion
      ) {
        return;
      }
      dispatch(
        sessionCharacterMoved({
          sessionCharacterId: id,
          x: p.x,
          y: p.y,
          facing: p.facing ?? 'FRONT',
          sizeScale: p.sizeScale,
        }),
      );
    };
    const onRemoved = (payload: unknown) => {
      const p = payload as {
        sessionCharacterId?: string;
        mapId?: string | null;
        originUserId?: string | null;
      };
      // Own echo: the master already removed it (or just hid it and must keep
      // seeing it) — ignore so a hidden character isn't dropped from the map.
      if (isOwnEcho(p?.originUserId)) return;
      if (isStaleMap(p?.mapId)) return;
      if (p?.sessionCharacterId) {
        dispatch(sessionCharacterRemoved({ sessionCharacterId: p.sessionCharacterId }));
      }
    };
    const sprite =
      (status: SpriteImageStatus) =>
      (payload: unknown) => {
        const p = payload as {
          characterId?: string;
          direction?: SpriteDirection;
          imageUrl?: string;
        };
        if (p?.characterId && p.direction) {
          dispatch(
            sessionSpriteUpdated({
              characterId: p.characterId,
              direction: p.direction,
              imageUrl: p.imageUrl,
              status,
            }),
          );
        }
      };
    // Master switched the map: clear the board and load the new map. The acting
    // master already applied it optimistically (own echo ignored).
    const onMapChanged = (payload: unknown) => {
      const p = payload as { currentMapId?: string; originUserId?: string | null };
      if (isOwnEcho(p?.originUserId)) return;
      activeMapIdRef.current = p?.currentMapId ?? activeMapIdRef.current;
      dispatch(clearSessionCharacters());
      dispatch(fetchActiveSession(campaignId));
    };
    // Point of interest moved on the scene by the master.
    const onPoiMoved = (payload: unknown) => {
      const p = payload as {
        mapId?: string | null;
        pointId?: string;
        sceneX?: number;
        sceneY?: number;
        clientMutationId?: string | null;
        originUserId?: string | null;
      };
      const pointId = p?.pointId;
      if (!pointId || p.sceneX == null || p.sceneY == null) return;
      if (isOwnEcho(p.originUserId)) return;
      if (isStaleMap(p.mapId)) return;
      if (poiDraggingIds.current.has(pointId)) return;
      const localVersion = poiVersions.current.get(pointId);
      if (
        localVersion != null &&
        p.clientMutationId != null &&
        Number(p.clientMutationId) < localVersion
      ) {
        return;
      }
      dispatch(
        sessionPointMoved({ pointId, sceneX: p.sceneX, sceneY: p.sceneY }),
      );
    };
    const subs: Array<[string, (payload: unknown) => void]> = [
      [SESSION_CHARACTER_EVENTS.added, onAdded],
      [SESSION_CHARACTER_EVENTS.moved, onMoved],
      [SESSION_CHARACTER_EVENTS.removed, onRemoved],
      [SESSION_EVENTS.mapChanged, onMapChanged],
      [MAP_POINT_EVENTS.scenePositionUpdated, onPoiMoved],
      [CHARACTER_SESSION_SPRITE_EVENTS.processing, sprite('processing')],
      [CHARACTER_SESSION_SPRITE_EVENTS.completed, sprite('completed')],
      [CHARACTER_SESSION_SPRITE_EVENTS.failed, sprite('failed')],
    ];
    realtime.join(room);
    subs.forEach(([e, h]) => realtime.on(e, h));
    return () => {
      subs.forEach(([e, h]) => realtime.off(e, h));
      realtime.leave(room);
    };
  }, [campaignId, activeSessionId, dispatch, myUserId]);

  // Live scene-generation updates (map.session_scene.*) via the campaign room.
  useEffect(() => {
    if (!campaignId || !active) return;
    const room = `campaign:${campaignId}`;
    const patch =
      (status: MapImageStatus) =>
      (payload: unknown) => {
        const p = payload as {
          mapId?: string;
          sessionSceneImageUrl?: string;
          errorMessage?: string;
        };
        if (!p?.mapId) return;
        dispatch(
          sessionSceneUpdate({
            mapId: p.mapId,
            status,
            sessionSceneImageUrl: p.sessionSceneImageUrl,
            error: p.errorMessage ?? null,
          }),
        );
      };
    const subs: Array<[string, (payload: unknown) => void]> = [
      [MAP_SESSION_SCENE_EVENTS.processing, patch('processing')],
      [MAP_SESSION_SCENE_EVENTS.completed, patch('completed')],
      [MAP_SESSION_SCENE_EVENTS.failed, patch('failed')],
    ];
    realtime.join(room);
    subs.forEach(([e, h]) => realtime.on(e, h));
    return () => {
      subs.forEach(([e, h]) => realtime.off(e, h));
      realtime.leave(room);
    };
  }, [campaignId, active, dispatch]);

  // Safety-net poll while the scene is building (missed realtime event, etc.).
  const sceneBuilding = sceneStatus === 'pending' || sceneStatus === 'processing';
  useImageFallbackPoll(!!sceneBuilding, () => {
    if (campaignId) dispatch(fetchActiveSession(campaignId));
  });

  const actions = useMemo<SessionAction[]>(
    () => (isMaster ? masterActions(t, poiEditMode) : playerActions(t)),
    [isMaster, t, poiEditMode],
  );

  const leave = () => navigate(`/campaigns/${campaignId}`);
  const onAction = (key: string) => {
    // Wired master actions: place a character on the map, or switch the map.
    if (isMaster && key === 'showCharacter') {
      setAddOpen(true);
      return;
    }
    if (isMaster && key === 'changeMap') {
      setChangeMapOpen(true);
      return;
    }
    if (isMaster && key === 'editPoints') {
      setPoiEditMode((v) => !v);
      return;
    }
    notify(t('session.actionSoon'), { variant: 'info' });
  };
  const onGenerateScene = () => {
    if (!campaignId || !sceneMapId) return;
    dispatch(generateSessionScene({ campaignId, mapId: sceneMapId }));
  };

  // ── placed-character interaction (master) ──
  // Optimistic move/resize with request cancellation and version guards, so
  // rapid drags/clicks never let a stale response or realtime echo win. Shared
  // state per sessionCharacterId. During a drag, external echoes are ignored.
  const saveControllers = useRef(new Map<string, AbortController>());
  const mutationVersions = useRef(new Map<string, number>());
  const draggingIds = useRef(new Set<string>());
  const resizeTimers = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = resizeTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  /**
   * Persist one field, aborting the previous in-flight save for the SAME field
   * of this token (so a facing save never cancels a visibility save). A canceled
   * (superseded) request stays silent; a real failure surfaces a discreet toast.
   */
  const saveField = (
    id: string,
    field: 'move' | 'size' | 'facing' | 'visibility',
    input: {
      x?: number;
      y?: number;
      sizeScale?: number;
      facing?: SpriteDirection;
      isVisibleToPlayers?: boolean;
    },
    version: number,
    errorKey: string,
  ) => {
    const key = `${id}:${field}`;
    saveControllers.current.get(key)?.abort();
    const controller = new AbortController();
    saveControllers.current.set(key, controller);
    void sessionService
      .updateCharacter(
        campaignId,
        id,
        { ...input, clientMutationId: String(version) },
        controller.signal,
      )
      .catch((err) => {
        // Aborted/superseded request — keep the local value, no error.
        if ((err as { message?: string })?.message === 'canceled') return;
        notify(t(errorKey), { variant: 'error' });
      });
  };

  const bumpVersion = (id: string): number => {
    const v = (mutationVersions.current.get(id) ?? 0) + 1;
    mutationVersions.current.set(id, v);
    return v;
  };

  // Add a character to the map optimistically: close the modal, show it right
  // away (placeholder if the sprite isn't ready), then confirm/rollback. Guards
  // against double-clicks and duplicates; the backend is idempotent too.
  const addCharacterToMap = (character: Character) => {
    if (!active) return;
    if (pendingAddIds.includes(character.id)) return;
    if (sessionCharacters.some((c) => c.characterId === character.id)) {
      setAddOpen(false);
      return;
    }
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    setPendingAddIds((ids) => [...ids, character.id]);
    setAddOpen(false);
    notify(t('session.characters.adding'), { variant: 'info' });

    dispatch(
      sessionCharacterAddedOptimistic({
        id: optimisticId,
        campaignId,
        sessionId: active.id,
        mapId: active.currentMapId,
        characterId: character.id,
        characterName: character.name,
        x: 50,
        y: 50,
        facing: 'FRONT',
        sizeScale: SIZE_SCALE_DEFAULT,
        isVisibleToPlayers: character.isPlayerCharacter,
        sprites: [],
        createdAt: '',
        updatedAt: '',
        isOptimistic: true,
      }),
    );

    const done = () => setPendingAddIds((ids) => ids.filter((id) => id !== character.id));
    sessionService
      .addCharacter(campaignId, { characterId: character.id, x: 50, y: 50 })
      .then((real) => {
        dispatch(sessionCharacterConfirmed(real));
        notify(t('session.characters.added'), { variant: 'success' });
      })
      .catch(() => {
        dispatch(sessionCharacterAddFailed({ optimisticId }));
        notify(t('session.characters.addError'), { variant: 'error' });
      })
      .finally(done);
  };

  // Switch the active map: clean the board instantly, then confirm. One switch
  // at a time. Pending character mutations from the old map are invalidated so a
  // late response/echo can't resurrect or move a token on the new map.
  const changeMapTo = (map: CampaignMap) => {
    if (changingMap || !active) return;
    if (map.id === active.currentMapId) {
      setChangeMapOpen(false);
      return;
    }
    setChangingMap(true);
    setChangeMapOpen(false);
    setSelectedId(null);
    setPoiEditMode(false);

    // Invalidate everything tied to the previous map's characters and points.
    saveControllers.current.forEach((c) => c.abort());
    saveControllers.current.clear();
    mutationVersions.current.clear();
    draggingIds.current.clear();
    pendingRemoveIds.current.clear();
    resizeTimers.current.forEach((id) => window.clearTimeout(id));
    resizeTimers.current.clear();
    poiControllers.current.forEach((c) => c.abort());
    poiControllers.current.clear();
    poiVersions.current.clear();
    poiDraggingIds.current.clear();

    // Optimistic: clear the board and point at the new map immediately.
    dispatch(clearSessionCharacters());
    dispatch(sessionMapSet(map));
    activeMapIdRef.current = map.id;

    sessionService
      .changeMap(campaignId, map.id)
      .then((res) => dispatch(setActiveSession(res.session)))
      .catch(() => {
        // Reconcile with the server truth and report.
        dispatch(fetchActiveSession(campaignId));
        notify(t('session.changeMap.error'), { variant: 'error' });
      })
      .finally(() => setChangingMap(false));
  };

  // ── points of interest (master, "reposition points" mode) ──
  const onPoiDragStart = (id: string) => {
    poiDraggingIds.current.add(id);
  };
  const onPoiDragLocal = (id: string, sceneX: number, sceneY: number) =>
    dispatch(sessionPointMoved({ pointId: id, sceneX, sceneY }));
  const onPoiCommit = (id: string, sceneX: number, sceneY: number) => {
    poiDraggingIds.current.delete(id);
    dispatch(sessionPointMoved({ pointId: id, sceneX, sceneY }));
    if (!active) return;
    const mapId = active.currentMapId;
    const version = (poiVersions.current.get(id) ?? 0) + 1;
    poiVersions.current.set(id, version);
    poiControllers.current.get(id)?.abort();
    const controller = new AbortController();
    poiControllers.current.set(id, controller);
    void mapService
      .updatePointScenePosition(
        campaignId,
        mapId,
        id,
        { sceneX, sceneY, clientMutationId: String(version) },
        controller.signal,
      )
      .catch((err) => {
        if ((err as { message?: string })?.message === 'canceled') return;
        notify(t('session.poi.error'), { variant: 'error' });
      });
  };

  const selected = sessionCharacters.find((c) => c.id === selectedId) ?? null;
  const onSelectCharacter = (c: SessionCharacter) => setSelectedId(c.id);

  // Drag: the frontend leads; the backend confirms only at drag end.
  const onDragCharacterStart = (id: string) => {
    draggingIds.current.add(id);
  };
  const onDragCharacterLocal = (id: string, x: number, y: number) =>
    dispatch(sessionCharacterDragged({ id, x, y }));
  const onCommitCharacter = (id: string, x: number, y: number) => {
    draggingIds.current.delete(id);
    dispatch(sessionCharacterDragged({ id, x, y }));
    const version = bumpVersion(id);
    saveField(id, 'move', { x, y }, version, 'session.characters.moveError');
  };
  // Facing: flip the sprite immediately, persist in the background.
  const setFacing = (facing: SpriteDirection) => {
    if (!selected || selected.facing === facing) return;
    const id = selected.id;
    dispatch(sessionCharacterPatched({ id, facing }));
    const version = bumpVersion(id);
    saveField(id, 'facing', { facing }, version, 'session.characters.facingError');
  };
  // Visibility: toggle immediately; the master keeps seeing hidden characters.
  const toggleVisibility = () => {
    if (!selected) return;
    const id = selected.id;
    const isVisibleToPlayers = !selected.isVisibleToPlayers;
    dispatch(sessionCharacterPatched({ id, isVisibleToPlayers }));
    const version = bumpVersion(id);
    saveField(
      id,
      'visibility',
      { isVisibleToPlayers },
      version,
      'session.characters.visibilityError',
    );
  };
  // Remove: vanish from the map immediately; restore + toast if it fails.
  const removeSelected = () => {
    if (!selected) return;
    const snapshot = selected;
    const id = snapshot.id;
    if (pendingRemoveIds.current.has(id)) return; // guard double-click
    pendingRemoveIds.current.add(id);
    dispatch(sessionCharacterRemoved({ sessionCharacterId: id }));
    setSelectedId(null);
    // Optimistic placeholders were never saved server-side — nothing to delete.
    if (snapshot.isOptimistic) {
      pendingRemoveIds.current.delete(id);
      return;
    }
    sessionService
      .removeCharacter(campaignId, id)
      .catch(() => {
        dispatch(sessionCharacterRestored(snapshot));
        notify(t('session.characters.removeError'), { variant: 'error' });
      })
      .finally(() => pendingRemoveIds.current.delete(id));
  };
  const resizeSelected = (sizeScale: number) => {
    if (!selected) return;
    const id = selected.id;
    // 1) Optimistic: the sprite resizes immediately.
    dispatch(sessionCharacterSized({ id, sizeScale }));
    // 2) Bump the shared version so older responses/echoes are ignored.
    const version = bumpVersion(id);
    // 3) Debounced save (cancels any pending timer for this character).
    const timers = resizeTimers.current;
    const pending = timers.get(id);
    if (pending) window.clearTimeout(pending);
    timers.set(
      id,
      window.setTimeout(
        () =>
          saveField(
            id,
            'size',
            { sizeScale },
            version,
            'session.characters.resizeError',
          ),
        350,
      ),
    );
  };
  const regenerateSelected = () => {
    if (selected) {
      void sessionService
        .generateSprites(campaignId, selected.characterId)
        .catch(() => {});
      notify(t('session.characters.regenerating'), { variant: 'info' });
    }
  };

  const title = campaignName ?? t('session.title');

  // Not loaded yet.
  if (!loaded && loading) {
    return (
      <Screen>
        <Centered>
          <Loading block label={t('session.loading')} />
        </Centered>
      </Screen>
    );
  }

  // Access denied / fetch error (e.g. not a participant).
  if (error && !active) {
    return (
      <Screen>
        <TopBar>
          <Title>{title}</Title>
          <Button variant="ghost" size="sm" leftIcon={<LeaveIcon size={16} />} onClick={leave}>
            {t('session.leave')}
          </Button>
        </TopBar>
        <Centered>
          <Alert variant="error">{error}</Alert>
        </Centered>
      </Screen>
    );
  }

  // No session in progress.
  if (!active) {
    return (
      <Screen>
        <TopBar>
          <Title>{title}</Title>
          <Button variant="ghost" size="sm" leftIcon={<LeaveIcon size={16} />} onClick={leave}>
            {t('session.leave')}
          </Button>
        </TopBar>
        <Centered>
          <EmptyState
            icon={<DiceIcon size={36} />}
            title={t('session.none.title')}
            description={
              isMaster ? t('session.none.master') : t('session.none.player')
            }
            actions={
              isMaster ? (
                <Button onClick={() => setStartOpen(true)}>
                  {t('session.none.start')}
                </Button>
              ) : undefined
            }
          />
        </Centered>
        {isMaster && (
          <StartSessionModal
            campaignId={campaignId}
            isOpen={startOpen}
            onClose={() => setStartOpen(false)}
            onStarted={() => setStartOpen(false)}
          />
        )}
      </Screen>
    );
  }

  // Active session — the game screen.
  return (
    <Screen>
      <TopBar>
        <Title>{title}</Title>
        <Button variant="ghost" size="sm" leftIcon={<LeaveIcon size={16} />} onClick={leave}>
          {t('session.leave')}
        </Button>
      </TopBar>
      <Main>
        <Sidebar>
          <SessionActionMenu
            actions={actions}
            orientation="vertical"
            onAction={onAction}
          />
        </Sidebar>
        <SessionGameViewport
          map={active.map}
          isMaster={isMaster}
          onGenerateScene={onGenerateScene}
          generating={sceneBuilding}
          characters={sessionCharacters}
          selectedCharacterId={selectedId}
          onSelectCharacter={onSelectCharacter}
          onDragCharacterStart={onDragCharacterStart}
          onDragCharacterLocal={onDragCharacterLocal}
          onCommitCharacter={onCommitCharacter}
          poiEditMode={poiEditMode}
          onPoiDragStart={onPoiDragStart}
          onPoiDragLocal={onPoiDragLocal}
          onPoiCommit={onPoiCommit}
        />
        <BottomBar>
          <SessionActionMenu
            actions={actions}
            orientation="horizontal"
            onAction={onAction}
          />
        </BottomBar>
      </Main>

      {isMaster && selected && (
        <SessionCharacterControls
          character={selected}
          onSetFacing={setFacing}
          onToggleVisibility={toggleVisibility}
          onRegenerate={regenerateSelected}
          onRemove={removeSelected}
          onResize={resizeSelected}
          onClose={() => setSelectedId(null)}
        />
      )}

      {isMaster && (
        <>
          <AddSessionCharacterModal
            campaignId={campaignId}
            isOpen={addOpen}
            onClose={() => setAddOpen(false)}
            placedCharacterIds={sessionCharacters.map((c) => c.characterId)}
            pendingCharacterIds={pendingAddIds}
            onPick={addCharacterToMap}
          />
          <ChangeMapModal
            campaignId={campaignId}
            isOpen={changeMapOpen}
            onClose={() => setChangeMapOpen(false)}
            currentMapId={active.currentMapId}
            onPick={changeMapTo}
          />
        </>
      )}
    </Screen>
  );
}

type TFn = (key: string) => string;

/** Mocked master actions for this story. */
function masterActions(t: TFn, poiEditMode: boolean): SessionAction[] {
  return [
    { key: 'narrate', label: t('session.action.narrate'), icon: <BookIcon size={20} /> },
    { key: 'changeMap', label: t('session.action.changeMap'), icon: <MapIcon size={20} /> },
    {
      key: 'editPoints',
      label: t(poiEditMode ? 'session.action.editPointsDone' : 'session.action.editPoints'),
      icon: <CompassIcon size={20} />,
    },
    { key: 'showCharacter', label: t('session.action.showCharacter'), icon: <CompassIcon size={20} /> },
    { key: 'showItem', label: t('session.action.showItem'), icon: <ShieldIcon size={20} /> },
    { key: 'showHandout', label: t('session.action.showHandout'), icon: <BookIcon size={20} /> },
    { key: 'masterNotes', label: t('session.action.masterNotes'), icon: <BookIcon size={20} /> },
    { key: 'manageScene', label: t('session.action.manageScene'), icon: <CompassIcon size={20} /> },
    { key: 'endSession', label: t('session.action.endSession'), icon: <LeaveIcon size={20} /> },
  ];
}

/** Mocked player actions for this story. */
function playerActions(t: TFn): SessionAction[] {
  return [
    { key: 'myCharacter', label: t('session.action.myCharacter'), icon: <CompassIcon size={20} /> },
    { key: 'abilities', label: t('session.action.abilities'), icon: <DiceIcon size={20} /> },
    { key: 'items', label: t('session.action.items'), icon: <BookIcon size={20} /> },
    { key: 'map', label: t('session.action.map'), icon: <MapIcon size={20} /> },
    { key: 'notes', label: t('session.action.notes'), icon: <BookIcon size={20} /> },
    { key: 'requestAction', label: t('session.action.requestAction'), icon: <ShieldIcon size={20} /> },
    { key: 'rollDice', label: t('session.action.rollDice'), icon: <DiceIcon size={20} /> },
  ];
}
