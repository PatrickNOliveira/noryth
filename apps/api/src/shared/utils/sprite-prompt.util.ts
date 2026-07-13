/**
 * Shared prompt fragments for 2.5D session-sprite generation. Both sprite prompt
 * builders (character and character-FORM) use these so the framing rules stay
 * identical. The important guarantee here is FRAMING: the AI must render the
 * WHOLE character inside the canvas with headroom, so heads/helmets/hoods are
 * never cropped at the top edge. Style/format are unchanged.
 */

/** Fixed asset-type + format clause (unchanged look). Always present. */
export const SPRITE_STYLE_CLAUSE =
  'Third-person game asset, Ragnarok-like readability, small tactical RPG sprite, full body visible from head to feet, clear silhouette, transparent background, isolated character sprite, no base, no circular token, no portrait frame. Dark fantasy medieval style, muted cold colors, readable details, designed to be placed on an isometric game map.';

/**
 * Framing/headroom clause — forces the ENTIRE character (head to feet) inside a
 * TALL/portrait canvas, standing with the feet near the bottom and clear empty
 * space above the head, so the top of the head/helmet is never cut off. The
 * feet-at-bottom framing matches how the sprite is anchored on the map.
 */
export const SPRITE_FRAMING_CLAUSE =
  'Vertical full-length composition: the complete character standing head to feet, feet near the BOTTOM edge, with clear EMPTY SPACE ABOVE THE HEAD. The entire head — helmet, hair, hood, horns or crown — and the feet must be fully visible inside the frame. The character must NEVER touch or cross the top edge and must never be cropped. Center it horizontally, occupying about 85 percent of the canvas HEIGHT with visible headroom at the top. Isolated standing full-body pose, not cropped, not close-up, not a portrait or bust.';

/** Negative prompt — steers away from portraits/tokens AND from any cropping. */
export const SPRITE_NEGATIVE_PROMPT = [
  // format / style
  'portrait', 'bust', 'close-up', 'face-only', 'circular token', 'token border',
  'card frame', 'UI', 'text', 'letters', 'watermark', 'signature',
  'background scene', 'landscape', 'large cinematic illustration', '3d render',
  'realistic photo', 'anime chibi', 'oversized head', 'multiple characters',
  'extra limbs', 'distorted anatomy', 'blurry', 'low quality',
  // cropping (the actual bug this fixes)
  'cropped body', 'cropped head', 'cut off head', 'head out of frame',
  'top of head cut off', 'cropped helmet', 'cut off helmet', 'helmet out of frame',
  'cropped hair', 'cut off hair', 'cropped hood', 'cut off hood', 'cropped horns',
  'cut off horns', 'cropped crown', 'cut off crown', 'cropped top', 'cut off top',
  'body touching top edge', 'head touching top edge', 'no headroom', 'tight crop',
  'close-up crop', 'partial body', 'missing head', 'missing legs', 'missing feet',
  'cropped feet', 'cut off feet', 'out of frame',
].join(', ');

/**
 * Normalizes a sprite prompt so the format AND the framing rules are always
 * present, whatever the LLM returned. Idempotent-ish: only adds a clause when its
 * marker is missing.
 */
export function withSpriteFraming(imagePrompt: string): string {
  let out = imagePrompt.trim();
  if (!/full[- ]body|sprite/i.test(out)) {
    out = `Full-body 2.5D isometric RPG character sprite. ${out}`;
  }
  if (!/transparent background/i.test(out)) {
    out = `${out} ${SPRITE_STYLE_CLAUSE}`;
  }
  // "above the head" is unique to the framing clause — a reliable presence marker.
  if (!/above the head/i.test(out)) {
    out = `${out} ${SPRITE_FRAMING_CLAUSE}`;
  }
  return out;
}
