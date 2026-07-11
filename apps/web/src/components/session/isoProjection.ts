/**
 * Coordinate helpers for the 2.5D session viewport.
 *
 * The board is an isometric diamond. Logical map coordinates are percentages
 * (x,y ∈ 0..100, matching `MapPoint`), and this module is the single place that
 * turns them into a screen position inside the viewport (also in percentages, so
 * everything stays responsive). Keeping the projection isolated here means future
 * stories (tokens, movement, ranges) reuse the exact same mapping.
 */

export interface IsoPosition {
  /** Horizontal position inside the viewport, in % (0..100). */
  left: number;
  /** Vertical position inside the viewport, in % (0..100). */
  top: number;
  /** Front-to-back ordering key (higher = closer to the camera). */
  depth: number;
}

/** Horizontal half-span of the diamond, as % of the viewport width. */
const HALF_SPAN_X = 42;
/** Vertical placement of the diamond within the viewport. */
const TOP_OFFSET = 14;
const SPAN_Y = 64;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Projects a logical map coordinate (percent) onto the isometric board.
 *
 *   (0,0)   → top corner
 *   (100,0) → right corner
 *   (100,100) → bottom corner
 *   (0,100) → left corner
 */
export function mapPercentToIsoPosition(x: number, y: number): IsoPosition {
  const u = clamp01(x / 100);
  const v = clamp01(y / 100);
  const isoX = u - v; // -1 (left) .. 1 (right)
  const isoY = (u + v) / 2; // 0 (back) .. 1 (front)
  return {
    left: 50 + isoX * HALF_SPAN_X,
    top: TOP_OFFSET + isoY * SPAN_Y,
    depth: u + v,
  };
}

/** The four corners of the board diamond, for drawing the ground plane/grid. */
export const ISO_BOARD_CORNERS = {
  back: mapPercentToIsoPosition(0, 0),
  right: mapPercentToIsoPosition(100, 0),
  front: mapPercentToIsoPosition(100, 100),
  left: mapPercentToIsoPosition(0, 100),
} as const;

/** Clamp a value to the 0–100 percentage range. */
export function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * Convert a percent map coordinate to a pixel position inside a rect (the real
 * rendered image area). Overlays/tokens use this so they land on the scene.
 */
export function mapPercentToViewportPosition(
  x: number,
  y: number,
  rect: Rect,
): { left: number; top: number } {
  return {
    left: rect.left + (clampPercent(x) / 100) * rect.width,
    top: rect.top + (clampPercent(y) / 100) * rect.height,
  };
}

/** Inverse of {@link mapPercentToViewportPosition} — pixels → percent (clamped). */
export function viewportPositionToMapPercent(
  left: number,
  top: number,
  rect: Rect,
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 50, y: 50 };
  return {
    x: clampPercent(((left - rect.left) / rect.width) * 100),
    y: clampPercent(((top - rect.top) / rect.height) * 100),
  };
}

/** `points` string for an SVG polygon covering the whole board diamond. */
export function isoBoardPolygon(): string {
  const { back, right, front, left } = ISO_BOARD_CORNERS;
  return [back, right, front, left]
    .map((p) => `${p.left},${p.top}`)
    .join(' ');
}

/**
 * Target aspect ratio of the session scene, used as the initial guess for the
 * scene box before the real image loads (the actual ratio is then read from the
 * loaded image). Landscape/widescreen — the scene is generated horizontally.
 */
export const SESSION_SCENE_ASPECT_RATIO = 16 / 9;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The pixel rectangle actually occupied by an `object-fit: contain` image inside
 * its container — i.e. the real rendered area, excluding the letterbox bands.
 *
 * Overlays (points of interest, tokens) must be positioned against THIS rect,
 * not the raw container, so percentage map coordinates land on the scene rather
 * than on the ambient/blurred background. Kept here so the whole session viewport
 * shares one coordinate source.
 */
export function getContainedImageRect(
  containerWidth: number,
  containerHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
): Rect {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageNaturalWidth <= 0 ||
    imageNaturalHeight <= 0
  ) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = imageNaturalWidth / imageNaturalHeight;
  if (imageRatio > containerRatio) {
    // Image is wider → fills width, letterboxed top/bottom.
    const width = containerWidth;
    const height = width / imageRatio;
    return { left: 0, top: (containerHeight - height) / 2, width, height };
  }
  // Image is taller → fills height, pillarboxed left/right.
  const height = containerHeight;
  const width = height * imageRatio;
  return { left: (containerWidth - width) / 2, top: 0, width, height };
}
