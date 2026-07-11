import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, Spinner } from '../ui';
import { CampaignMap, MapPoint } from '../../types/map';
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

/**
 * The 2.5D session game viewport. Its main element is the map's SESSION SCENE —
 * a distinct isometric "game viewport" asset generated from the map (not the map
 * image tilted). It fills all available space and is organized in layers so
 * future stories can drop tokens/characters onto the same coordinate system:
 *
 *   Viewport                    fills the area, dark tabletop backdrop
 *    ├ SceneStage | IsoBoard     the scene asset (or a generic board while it builds)
 *    │   ├ SceneAmbient          soft blurred extension filling any leftover space
 *    │   └ SceneBox              image at its OWN aspect ratio → no crop, no stretch
 *    │       └ markers + TokenLayer (aligned to the real image, not the viewport)
 *    ├ PieceLayer                points of interest overlay (fallback board only)
 *    ├ Vignette + Overlay        discreet map-name HUD
 *    └ StatusOverlay             building / failed(+retry) states
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
 * The scene at its OWN aspect ratio, sized to the largest box that fits the
 * stage. Because the box ratio equals the image ratio, `cover` fills it exactly
 * — no crop, no stretch, no letterbox. This box IS the real rendered image, so
 * markers/tokens placed inside it line up with the scene.
 */
const SceneBox = styled.div<{ $ar: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: ${({ $ar }) => $ar};
  width: min(100cqw, calc(100cqh * ${({ $ar }) => $ar}));
  height: min(100cqh, calc(100cqw / ${({ $ar }) => $ar}));
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    display: block;
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
        <SceneStage>
          <SceneAmbient
            aria-hidden="true"
            style={{ backgroundImage: `url(${sceneUrl})` }}
          />
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
