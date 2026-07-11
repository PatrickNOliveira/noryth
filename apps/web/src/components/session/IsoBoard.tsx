import { useId, useMemo } from 'react';
import { useTheme } from 'styled-components';
import {
  ISO_BOARD_CORNERS,
  isoBoardPolygon,
  mapPercentToIsoPosition,
} from './isoProjection';

/**
 * The isometric ground plane of the session viewport — drawn by the UI, not the
 * map image. An SVG diamond with a tactical grid and a little edge thickness for
 * the 2.5D feel. The map image, when present, is used only as a faint, blurred
 * texture clipped to the board (a reference, never the main element).
 *
 * The SVG uses a 0..100 viewBox with `preserveAspectRatio: none`, so its
 * coordinate space matches the percentage positioning of markers/tokens — board
 * and pieces always stay aligned, at any container size.
 */

const GRID_STEPS = 8;

interface IsoBoardProps {
  /** Optional map image, used as a subtle board texture only. */
  imageUrl?: string | null;
}

export function IsoBoard({ imageUrl }: IsoBoardProps) {
  const theme = useTheme();
  const rawId = useId();
  const clipId = `iso-clip-${rawId}`;
  const gridId = `iso-grid-${rawId}`;

  const polygon = isoBoardPolygon();
  const { back, right, front, left } = ISO_BOARD_CORNERS;

  // Grid lines along both logical axes, projected to the diamond.
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 1; i < GRID_STEPS; i += 1) {
      const t = (i / GRID_STEPS) * 100;
      const uA = mapPercentToIsoPosition(t, 0);
      const uB = mapPercentToIsoPosition(t, 100);
      lines.push({ x1: uA.left, y1: uA.top, x2: uB.left, y2: uB.top });
      const vA = mapPercentToIsoPosition(0, t);
      const vB = mapPercentToIsoPosition(100, t);
      lines.push({ x1: vA.left, y1: vA.top, x2: vB.left, y2: vB.top });
    }
    return lines;
  }, []);

  // Thickness skirt under the two front-facing edges.
  const dh = 6;
  const skirt = [
    `${left.left},${left.top}`,
    `${left.left},${left.top + dh}`,
    `${front.left},${front.top + dh}`,
    `${right.left},${right.top + dh}`,
    `${right.left},${right.top}`,
    `${front.left},${front.top}`,
  ].join(' ');

  const edge = theme.colors.borderStrong;
  const gridStroke = `color-mix(in srgb, ${theme.colors.primary} 30%, transparent)`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, display: 'block' }}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <polygon points={polygon} />
        </clipPath>
        <radialGradient id={gridId} cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#2a2114" />
          <stop offset="100%" stopColor="#120e09" />
        </radialGradient>
      </defs>

      {/* Edge thickness (drawn first, behind the top face). */}
      <polygon
        points={skirt}
        fill="#0c0a06"
        stroke={edge}
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
      />

      {/* Ground plane. */}
      <polygon points={polygon} fill={`url(#${gridId})`} />

      {/* Faint blurred map texture, clipped to the board. */}
      {imageUrl && (
        <g clipPath={`url(#${clipId})`}>
          <image
            href={imageUrl}
            x={left.left}
            y={back.top}
            width={right.left - left.left}
            height={front.top - back.top}
            preserveAspectRatio="xMidYMid slice"
            opacity={0.22}
            style={{ filter: 'blur(1.5px)' }}
          />
        </g>
      )}

      {/* Tactical grid, clipped to the board. */}
      <g clipPath={`url(#${clipId})`}>
        {gridLines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={gridStroke}
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Board outline. */}
      <polygon
        points={polygon}
        fill="none"
        stroke={edge}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
