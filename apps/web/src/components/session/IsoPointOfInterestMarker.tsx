import { PointerEvent } from 'react';
import styled from 'styled-components';
import { IsoPosition } from './isoProjection';

/**
 * An upright marker standing on the isometric board / scene — a point of
 * interest (or, larger, the central map landmark). Positioned by percentage so
 * it lines up with the scene; `depth` drives paint order. Presentational by
 * default; in "edit points" mode it becomes draggable (master only).
 */

const Anchor = styled.div<{
  $left: number;
  $top: number;
  $z: number;
  $draggable: boolean;
}>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  top: ${({ $top }) => $top}%;
  z-index: ${({ $z }) => $z};
  transform: translate(-50%, -100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: ${({ $draggable }) => ($draggable ? 'auto' : 'none')};
  cursor: ${({ $draggable }) => ($draggable ? 'grab' : 'default')};
  touch-action: ${({ $draggable }) => ($draggable ? 'none' : 'auto')};
  &:active {
    cursor: ${({ $draggable }) => ($draggable ? 'grabbing' : 'default')};
  }
`;

const Pin = styled.div<{ $size: number; $landmark: boolean; $highlight: boolean }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: ${({ theme, $landmark }) =>
    $landmark
      ? `linear-gradient(135deg, ${theme.colors.primary}, color-mix(in srgb, ${theme.colors.primary} 60%, black))`
      : `linear-gradient(135deg, color-mix(in srgb, ${theme.colors.primary} 80%, white), ${theme.colors.primary})`};
  border: 1.5px solid
    ${({ theme, $highlight }) =>
      $highlight
        ? theme.colors.primary
        : `color-mix(in srgb, ${theme.colors.primary} 40%, black)`};
  box-shadow: ${({ $highlight }) =>
    $highlight
      ? '0 0 0 2px rgba(220,190,120,0.6), 0 6px 10px -3px rgba(0,0,0,0.7)'
      : '0 6px 10px -3px rgba(0, 0, 0, 0.7)'};
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    transform: rotate(45deg);
    font-family: ${({ theme }) => theme.typography.fontFamily.heading};
    font-size: ${({ $size }) => Math.round($size * 0.42)}px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.surface};
    line-height: 1;
  }
`;

/** Soft ground shadow at the marker's base, sitting on the plane. */
const Shadow = styled.div<{ $size: number }>`
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: ${({ $size }) => Math.round($size * 0.9)}px;
  height: ${({ $size }) => Math.round($size * 0.34)}px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%);
`;

const Label = styled.div<{ $landmark: boolean }>`
  margin-top: ${({ theme }) => theme.spacing.xxs};
  max-width: 140px;
  padding: 1px ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 82%, transparent);
  border: 1px solid ${({ theme }) => theme.colors.border};
  backdrop-filter: blur(3px);
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme, $landmark }) =>
    $landmark ? theme.typography.fontSize.sm : theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface MarkerProps {
  position: IsoPosition;
  name: string;
  /** Short glyph inside the pin (defaults to the name's initial). */
  glyph?: string;
  showLabel?: boolean;
  landmark?: boolean;
  /** Draggable + highlighted when the master is repositioning points. */
  draggable?: boolean;
  onPointerDown?: (e: PointerEvent) => void;
}

export function IsoPointOfInterestMarker({
  position,
  name,
  glyph,
  showLabel = true,
  landmark = false,
  draggable = false,
  onPointerDown,
}: MarkerProps) {
  const size = landmark ? 46 : 26;
  const initial = (glyph ?? (name.trim().charAt(0) || '•')).toUpperCase();
  return (
    <Anchor
      $left={position.left}
      $top={position.top}
      $z={Math.round(position.depth * 100) + (landmark ? 1 : 0)}
      $draggable={draggable}
      onPointerDown={onPointerDown}
    >
      <Pin $size={size} $landmark={landmark} $highlight={draggable}>
        <span>{initial}</span>
        <Shadow $size={size} />
      </Pin>
      {showLabel && <Label $landmark={landmark}>{name}</Label>}
    </Anchor>
  );
}
