import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, Spinner } from '../ui';
import { media } from '../../styles/media';
import { CampaignMap } from '../../types/map';
import { SessionCharacter } from '../../types/session';
import { IsoBoard } from './IsoBoard';
import { IsoPointOfInterestMarker } from './IsoPointOfInterestMarker';
import { SessionMapOverlay } from './SessionMapOverlay';
import { SessionCharacterLayer } from './SessionCharacterLayer';
import { SessionPoiLayer } from './SessionPoiLayer';
import {
  mapPercentToIsoPosition,
  SESSION_SCENE_ASPECT_RATIO,
} from './isoProjection';

/** Zoom bounds for the mobile camera. Min = 1 (cover fill; never any empty band). */
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.35;

/**
 * The 2.5D session game viewport. Its main element is the map's SESSION SCENE —
 * a distinct isometric "game viewport" asset generated from the map (not the map
 * image tilted). It fills all available space and is organized in layers so
 * future stories can drop tokens/characters onto the same coordinate system:
 *
 *   Viewport                    fills the area, dark tabletop backdrop
 *    ├ SceneStage | IsoBoard     the scene asset (or a generic board while it builds)
 *    │   ├ SceneAmbient          soft blurred extension filling any leftover space
 *    │   └ Camera                pan/zoom transform (mobile only; identity on desktop)
 *    │       └ SceneBox          desktop: CONTAIN (own AR); mobile: COVER (fills viewport)
 *    │           └ PanCatcher + markers + TokenLayer (aligned to the real image)
 *    ├ PieceLayer                points of interest overlay (fallback board only)
 *    ├ ZoomControls              +/−/reset (mobile only)
 *    ├ Vignette + Overlay        discreet map-name HUD
 *    └ StatusOverlay             building / failed(+retry) states
 *
 * MOBILE: the scene is a navigable game viewport — it COVERS the screen (no small
 * centered image, no empty bands) and the master can pan (drag empty area) and
 * zoom (buttons). Because the whole layer (image + POIs + characters) shares ONE
 * transform, tokens/points stay perfectly aligned. DESKTOP is unchanged.
 */

const Viewport = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #080604;
`;

/** Fills the viewport and defines a size container so the scene box can size
 * itself to the largest rectangle of the image's aspect ratio that fits. */
const SceneStage = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  container-type: size;
`;

/**
 * Soft extension of the scene that fills any leftover space when the viewport
 * and image aspect ratios differ. It is the SAME image (cover + blur), NOT
 * darkened — so the sides read as the environment continuing, never as black
 * borders. Purely decorative.
 */
const SceneAmbient = styled.div`
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(26px);
  transform: scale(1.15);
`;

/**
 * The scene, sized so markers/tokens (placed at percentages of this box) line up
 * with the real rendered image. MOBILE (base): sized to COVER the stage — the
 * smallest image-AR box that fills it, so the crisp scene fills the screen and
 * the overflow is cropped (reachable by panning). DESKTOP (`tablet`+): CONTAIN —
 * the largest box that fits, so nothing crops and the ambient fills the sides.
 */
const SceneBox = styled.div<{ $ar: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: ${({ $ar }) => $ar};
  /* Mobile-first: COVER. */
  width: max(100cqw, calc(100cqh * ${({ $ar }) => $ar}));
  height: max(100cqh, calc(100cqw / ${({ $ar }) => $ar}));
  overflow: hidden;

  ${media.tablet} {
    /* Desktop: CONTAIN (unchanged behavior). */
    width: min(100cqw, calc(100cqh * ${({ $ar }) => $ar}));
    height: min(100cqh, calc(100cqw / ${({ $ar }) => $ar}));
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    display: block;
  }
`;

/**
 * Pan/zoom camera. On mobile the master pans/zooms; on desktop it stays at the
 * identity transform (no interaction is enabled there), so desktop is unchanged.
 * Its transform moves the WHOLE scene layer, keeping tokens/points in sync.
 */
const Camera = styled.div`
  position: absolute;
  inset: 0;
  transform-origin: center center;
  will-change: transform;
`;

/**
 * Catches drags on EMPTY scene area to pan (mobile only). It sits below the POI
 * and character layers, so touching a sprite/point still selects/drags it — the
 * catcher only receives pointers where nothing interactive is on top.
 */
const PanCatcher = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  touch-action: none;
  cursor: grab;
  pointer-events: auto;
  &:active {
    cursor: grabbing;
  }
  ${media.tablet} {
    pointer-events: none;
  }
`;

/** Floating zoom/reset controls, bottom-right, above the action bar. Mobile only. */
const ZoomControls = styled.div`
  position: absolute;
  right: ${({ theme }) => theme.spacing.sm};
  bottom: ${({ theme }) => theme.spacing.sm};
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};

  ${media.tablet} {
    display: none;
  }
`;

const PieceLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 45%,
    transparent 55%,
    rgba(0, 0, 0, 0.6) 100%
  );
`;

/** Centered status panel for building/failed states. */
const Status = styled.div`
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 45%, transparent);
`;

const StatusText = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  max-width: 420px;
`;

const StatusSub = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  max-width: 420px;
`;

interface SessionGameViewportProps {
  map: CampaignMap | null;
  isMaster: boolean;
  onGenerateScene: () => void;
  generating: boolean;
  characters: SessionCharacter[];
  selectedCharacterId: string | null;
  onSelectCharacter: (character: SessionCharacter) => void;
  onDragCharacterStart: (id: string) => void;
  onDragCharacterLocal: (id: string, x: number, y: number) => void;
  onCommitCharacter: (id: string, x: number, y: number) => void;
  /** "Reposition points" mode — the master drags POIs, not characters. */
  poiEditMode: boolean;
  onPoiDragStart: (id: string) => void;
  onPoiDragLocal: (id: string, x: number, y: number) => void;
  onPoiCommit: (id: string, x: number, y: number) => void;
}

export function SessionGameViewport({
  map,
  isMaster,
  onGenerateScene,
  generating,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onDragCharacterStart,
  onDragCharacterLocal,
  onCommitCharacter,
  poiEditMode,
  onPoiDragStart,
  onPoiDragLocal,
  onPoiCommit,
}: SessionGameViewportProps) {
  const { t } = useTranslation();

  const characterLayer = (
    <SessionCharacterLayer
      characters={characters}
      // In POI edit mode characters are not draggable nor interactive, so the
      // master can freely grab points that sit under a sprite.
      isMaster={isMaster && !poiEditMode}
      interactive={!poiEditMode}
      selectedId={selectedCharacterId}
      onSelect={onSelectCharacter}
      onDragStart={onDragCharacterStart}
      onDragLocal={onDragCharacterLocal}
      onCommit={onCommitCharacter}
    />
  );
  // Real aspect ratio of the loaded scene image; the box matches it so the
  // scene never crops or stretches. Starts at the widescreen target.
  const [sceneAr, setSceneAr] = useState(SESSION_SCENE_ASPECT_RATIO);

  const status = map?.sessionSceneImageStatus ?? 'none';
  const sceneUrl = map?.sessionSceneImageUrl ?? null;
  const hasScene = status === 'completed' && !!sceneUrl;
  const building = status === 'pending' || status === 'processing';
  const failed = status === 'failed';

  // ── mobile pan/zoom camera ──────────────────────────────────
  // The transform lives on the Camera wrapper, so it moves image + POIs + tokens
  // together. Desktop never enables the interactions (PanCatcher/buttons are CSS-
  // hidden at `tablet`+), so `cam` stays identity there and desktop is unchanged.
  const stageRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;

  // Keep the cover-sized scene from being dragged off-screen: clamp pan to the
  // overflow on each axis ((scaledBox − stage) / 2), measured live from the stage.
  const clampPan = (x: number, y: number, zoom: number) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage || stage.width === 0 || stage.height === 0) return { x, y };
    const boxW = Math.max(stage.width, stage.height * sceneAr);
    const boxH = Math.max(stage.height, stage.width / sceneAr);
    const maxX = Math.max(0, (boxW * zoom - stage.width) / 2);
    const maxY = Math.max(0, (boxH * zoom - stage.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const onPanStart = (e: ReactPointerEvent) => {
    const sx = e.clientX;
    const sy = e.clientY;
    const px = camRef.current.x;
    const py = camRef.current.y;
    const move = (ev: globalThis.PointerEvent) => {
      const next = clampPan(
        px + (ev.clientX - sx),
        py + (ev.clientY - sy),
        camRef.current.zoom,
      );
      setCam((prev) => ({ ...prev, x: next.x, y: next.y }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const applyZoom = (factor: number) =>
    setCam((prev) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev.zoom * factor));
      const p = clampPan(prev.x, prev.y, zoom);
      return { x: p.x, y: p.y, zoom };
    });
  const resetCam = () => setCam({ x: 0, y: 0, zoom: 1 });

  // A new scene recenters the camera; resize/orientation re-clamps the pan.
  useEffect(() => {
    setCam({ x: 0, y: 0, zoom: 1 });
  }, [sceneUrl]);
  useEffect(() => {
    const onResize = () =>
      setCam((prev) => ({ ...prev, ...clampPan(prev.x, prev.y, prev.zoom) }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // clampPan closes over sceneAr; rebind the listener when the ratio changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneAr]);

  const points = map?.points ?? [];
  const unplaced = points.filter((p) => p.x == null || p.y == null);
  let ringCursor = 0;

  // Fallback-board markers (iso projection over the generic board).
  const boardMarkers = points.map((p) => {
    const placed = p.x != null && p.y != null;
    const coords = placed
      ? { x: p.x as number, y: p.y as number }
      : ringPosition(ringCursor++, unplaced.length);
    return {
      id: p.id,
      name: p.name,
      showLabel: p.showLabelOnMap || placed,
      position: mapPercentToIsoPosition(coords.x, coords.y),
    };
  });

  return (
    <Viewport>
      {hasScene ? (
        <SceneStage ref={stageRef}>
          <SceneAmbient
            aria-hidden="true"
            style={{ backgroundImage: `url(${sceneUrl})` }}
          />
          <Camera
            style={{
              transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
            }}
          >
            <SceneBox $ar={sceneAr}>
              <img
                src={sceneUrl as string}
                alt={map?.name ?? ''}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    setSceneAr(naturalWidth / naturalHeight);
                  }
                }}
              />
              {/* Drag on empty scene = pan the camera (mobile). Sits below the POI
                  and character layers, so it never steals a token/point pointer. */}
              <PanCatcher onPointerDown={onPanStart} />
              {/* Points of interest — draggable for the master in edit mode. */}
              <SessionPoiLayer
                points={points}
                editable={isMaster && poiEditMode}
                onDragStart={onPoiDragStart}
                onDragLocal={onPoiDragLocal}
                onCommit={onPoiCommit}
              />
              {/* CharacterLayer — above the map and the points of interest. */}
              {characterLayer}
            </SceneBox>
          </Camera>
          <ZoomControls>
            <IconButton
              size="md"
              variant="subtle"
              label={t('session.viewport.zoomIn')}
              icon={<span aria-hidden="true">+</span>}
              onClick={() => applyZoom(ZOOM_STEP)}
            />
            <IconButton
              size="md"
              variant="subtle"
              label={t('session.viewport.zoomOut')}
              icon={<span aria-hidden="true">−</span>}
              onClick={() => applyZoom(1 / ZOOM_STEP)}
            />
            <IconButton
              size="md"
              variant="subtle"
              label={t('session.viewport.reset')}
              icon={<span aria-hidden="true">⟲</span>}
              onClick={resetCam}
            />
          </ZoomControls>
        </SceneStage>
      ) : (
        <>
          <IsoBoard imageUrl={map?.imageUrl ?? null} />
          <PieceLayer>
            {boardMarkers.map((m) => (
              <IsoPointOfInterestMarker
                key={m.id}
                position={m.position}
                name={m.name}
                showLabel={m.showLabel}
              />
            ))}
            {map && (
              <IsoPointOfInterestMarker
                position={mapPercentToIsoPosition(50, 50)}
                name={map.name}
                landmark
              />
            )}
          </PieceLayer>
          {characterLayer}
        </>
      )}

      <Vignette />
      <SessionMapOverlay map={map} />

      {building && (
        <Status>
          <Spinner />
          <StatusText>{t('session.scene.building')}</StatusText>
          <StatusSub>{t('session.scene.buildingHint')}</StatusSub>
        </Status>
      )}

      {failed && (
        <Status>
          <StatusText>{t('session.scene.failed')}</StatusText>
          {isMaster ? (
            <Button onClick={onGenerateScene} loading={generating}>
              {t('session.scene.retry')}
            </Button>
          ) : (
            <StatusSub>{t('session.scene.failedPlayer')}</StatusSub>
          )}
        </Status>
      )}

      {status === 'none' && isMaster && (
        <Status>
          <StatusText>{t('session.scene.none')}</StatusText>
          <Button onClick={onGenerateScene} loading={generating}>
            {t('session.scene.generate')}
          </Button>
        </Status>
      )}
    </Viewport>
  );
}

/** Lay an unplaced point on a ring around the board center. */
function ringPosition(index: number, total: number): { x: number; y: number } {
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  return { x: 50 + Math.cos(angle) * 32, y: 50 + Math.sin(angle) * 32 };
}
