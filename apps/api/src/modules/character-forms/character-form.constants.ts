/**
 * Alternative character forms — a campaign-preparation feature (NOT session).
 * The form's image rides the same async AI-image pipeline as portraits.
 */

/** Job name for the async form image generation (shares the AI image queue). */
export const GENERATE_CHARACTER_FORM_IMAGE_JOB = 'generate-character-form-image';

export interface GenerateCharacterFormImagePayload {
  formId: string;
  requestedBy: string;
  adjustments?: string;
  ignoreArtDirection?: boolean;
}

/** Server → client events for form image generation (prep/sheet only). */
export const CHARACTER_FORM_IMAGE_EVENTS = {
  processing: 'character.form.image.processing',
  completed: 'character.form.image.completed',
  failed: 'character.form.image.failed',
} as const;

/** Job name for the async 2.5D session sprite of a FORM (shares the AI queue). */
export const GENERATE_CHARACTER_FORM_SPRITE_JOB = 'generate-character-form-sprite';

export interface GenerateCharacterFormSpritePayload {
  spriteId: string;
  requestedBy: string;
}

/** Server → client events for a form's session-sprite generation. */
export const CHARACTER_FORM_SESSION_SPRITE_EVENTS = {
  processing: 'character.form.session_sprite.processing',
  completed: 'character.form.session_sprite.completed',
  failed: 'character.form.session_sprite.failed',
} as const;
