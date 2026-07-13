import { PointerEvent, useRef } from 'react';
import styled from 'styled-components';
import { SessionCharacter } from '../../types/session';
import { SessionCharacterSprite } from './SessionCharacterSprite';
import { viewportPositionToMapPercent } from './isoProjection';

/**
 * The character layer, above the scene image and the point-of-interest markers.
 * Fills the scene box exactly, so percentage positions map onto the real image.
 * The master can drag sprites; players only see updates.
 *
 * Tap vs. drag: a pointerdown does NOT select — it waits. If the pointer moves
 * past {@link DRAG_THRESHOLD_PX} it becomes a DRAG (move the token, never select);
 * otherwise, on release, it's a TAP (select → opens the mobile bottom sheet /
 * desktop panel). This stops the sheet from popping up the instant the master
 * grabs a token to reposition it, and avoids the ghost-click-after-drag opening
 * the sheet (selection is our own pointerup decision, not a click handler).
 */

/** Movement (px) beyond which a touch is treated as a drag, not a tap. */
const DRAG_THRESHOLD_PX = 8;
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

  // Wait to classify the gesture: only a real tap selects; a drag moves the token
  // (and never selects), so grabbing a sprite doesn't open the sheet mid-drag.
  const startInteraction = (e: PointerEvent, character: SessionCharacter) => {
    const id = character.id;
    const startX = e.clientX;
    const startY = e.clientY;
    const canDrag = isMaster;
    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    let dragStarted = false;
    // Own the whole gesture: stop it bubbling into map/pan layers, and CAPTURE the
    // pointer so pointerup — and the synthetic click the browser fires after it —
    // is delivered to THIS sprite even if the finger lifts over the bottom bar.
    // Without capture, tapping/dropping a token near the footer would also trigger
    // the bottom-bar button underneath (click-through).
    e.preventDefault();
    e.stopPropagation();
    target.setPointerCapture?.(pointerId);

    const move = (ev: globalThis.PointerEvent) => {
      if (!dragStarted) {
        if (!canDrag) return;
        const distance = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (distance <= DRAG_THRESHOLD_PX) return;
        // Crossed the threshold → this is a drag. onDragStart also closes the
        // mobile sheet (via the parent) so the map stays visible while moving.
        dragStarted = true;
        onDragStart(id);
      }
      const { x, y } = toPercent(ev.clientX, ev.clientY);
      onDragLocal(id, x, y);
    };
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (target.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      if (dragStarted) {
        const { x, y } = toPercent(ev.clientX, ev.clientY);
        onCommit(id, x, y);
      } else {
        // A real tap (no movement past the threshold) → select.
        onSelect(character);
      }
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
          onPointerDown={startInteraction}
        />
      ))}
    </Layer>
  );
}
