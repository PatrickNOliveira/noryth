import { PointerEvent, useRef } from 'react';
import styled from 'styled-components';
import { SessionCharacter } from '../../types/session';
import { SessionCharacterSprite } from './SessionCharacterSprite';
import { viewportPositionToMapPercent } from './isoProjection';

/**
 * The character layer, above the scene image and the point-of-interest markers.
 * Fills the scene box exactly, so percentage positions map onto the real image.
 * The master can drag sprites; players only see updates.
 */
const Layer = styled.div<{ $interactive: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;

  /* Sprites re-enable pointer events for selection/drag (unless disabled, e.g.
     while the master is repositioning points of interest). */
  & > * {
    pointer-events: ${({ $interactive }) => ($interactive ? 'auto' : 'none')};
  }
`;

interface Props {
  characters: SessionCharacter[];
  isMaster: boolean;
  /** When false, sprites don't capture pointer events (POI edit mode). */
  interactive?: boolean;
  selectedId: string | null;
  onSelect: (character: SessionCharacter) => void;
  /** A drag has begun for this character. */
  onDragStart: (id: string) => void;
  /** Local optimistic move during drag. */
  onDragLocal: (id: string, x: number, y: number) => void;
  /** Commit the final position (persist + realtime). */
  onCommit: (id: string, x: number, y: number) => void;
}

export function SessionCharacterLayer({
  characters,
  isMaster,
  interactive = true,
  selectedId,
  onSelect,
  onDragStart,
  onDragLocal,
  onCommit,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const toPercent = (clientX: number, clientY: number) => {
    const el = layerRef.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    return viewportPositionToMapPercent(clientX, clientY, {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    });
  };

  const startDrag = (e: PointerEvent, character: SessionCharacter) => {
    if (!isMaster) return;
    e.preventDefault();
    dragging.current = true;
    const id = character.id;
    onDragStart(id);

    const move = (ev: globalThis.PointerEvent) => {
      if (!dragging.current) return;
      const { x, y } = toPercent(ev.clientX, ev.clientY);
      onDragLocal(id, x, y);
    };
    const up = (ev: globalThis.PointerEvent) => {
      dragging.current = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const { x, y } = toPercent(ev.clientX, ev.clientY);
      onCommit(id, x, y);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <Layer ref={layerRef} $interactive={interactive}>
      {characters.map((c) => (
        <SessionCharacterSprite
          key={c.id}
          character={c}
          selected={selectedId === c.id}
          draggable={isMaster}
          onSelect={onSelect}
          onPointerDown={startDrag}
        />
      ))}
    </Layer>
  );
}
