import { PointerEvent, useRef } from 'react';
import styled from 'styled-components';
import { MapPoint } from '../../types/map';
import { IsoPointOfInterestMarker } from './IsoPointOfInterestMarker';
import { viewportPositionToMapPercent } from './isoProjection';

/**
 * The points-of-interest layer over the 2.5D scene. Each marker renders at its
 * SCENE position (sceneX/sceneY) with a fallback to the cartographic x/y, then
 * to the center — so a point always shows where it already showed. In "edit
 * points" mode the master can drag markers; players never can.
 */
const Layer = styled.div<{ $editing: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 15;
  pointer-events: none;

  /* Only markers opt back into pointer events (in edit mode). */
  & > * {
    pointer-events: ${({ $editing }) => ($editing ? 'auto' : 'none')};
  }
`;

/** sceneX/sceneY, falling back to x/y, then 50/50 — never off-scene. */
function renderPos(p: MapPoint): { left: number; top: number; depth: number } {
  const left = p.sceneX ?? p.x ?? 50;
  const top = p.sceneY ?? p.y ?? 50;
  return { left, top, depth: top / 100 };
}

interface Props {
  points: MapPoint[];
  editable: boolean;
  onDragStart: (id: string) => void;
  onDragLocal: (id: string, x: number, y: number) => void;
  onCommit: (id: string, x: number, y: number) => void;
}

export function SessionPoiLayer({
  points,
  editable,
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

  const startDrag = (e: PointerEvent, id: string) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
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
    <Layer ref={layerRef} $editing={editable}>
      {points.map((p) => (
        <IsoPointOfInterestMarker
          key={p.id}
          position={renderPos(p)}
          name={p.name}
          showLabel={p.showLabelOnMap || editable}
          draggable={editable}
          onPointerDown={(e) => startDrag(e, p.id)}
        />
      ))}
    </Layer>
  );
}
