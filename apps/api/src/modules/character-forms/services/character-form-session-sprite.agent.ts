import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import { SpriteDirection } from '@modules/sessions/session-character.constants';

export interface FormSpriteCampaignContext {
  theme: string;
  tone: string;
  mainLanguage: string;
}
export interface FormSpriteBaseContext {
  name: string;
  title: string;
  shortDescription: string;
}
export interface FormSpriteFormContext {
  name: string;
  appearanceDescription: string;
}
export interface FormSpriteOptions {
  artDirection?: string;
  factionName?: string;
}
export interface FormSpritePrompt {
  imagePrompt: string;
  negativePrompt: string;
}

const NEGATIVE_PROMPT = [
  'portrait', 'bust', 'close-up', 'face-only', 'circular token', 'token border',
  'card frame', 'UI', 'text', 'letters', 'watermark', 'signature', 'background scene',
  'landscape', 'large illustration', '3d render', 'realistic photo', 'anime chibi',
  'oversized head', 'cropped body', 'missing legs', 'cut off feet', 'blurry',
  'low quality', 'multiple characters', 'extra limbs', 'distorted anatomy',
].join(', ');

const STYLE_CLAUSE =
  'Third-person game asset, Ragnarok-like readability, small tactical RPG sprite, full body visible from head to feet, clear silhouette, transparent background, isolated character sprite, no base, no circular token, no portrait frame. Dark fantasy medieval style, muted cold colors, readable details, designed to be placed on an isometric game map.';

const FACING_CLAUSE: Record<SpriteDirection, string> = {
  FRONT: 'facing the camera (front view)',
  BACK: 'viewed from behind, facing away from the camera (back view)',
};

const SYSTEM_PROMPT = `You are a game artist for a dark-fantasy tactical RPG.
Turn a character and one of their ALTERNATIVE FORMS into ONE concise, visual, English prompt for a 2.5D ISOMETRIC CHARACTER SPRITE — a small full-body third-person game asset placed on a map. NOT a portrait, NOT a token, NOT a card.

Hard rules:
- FULL-BODY 2.5D isometric RPG character sprite (head to feet), third-person, readable at small size, clear silhouette, TRANSPARENT background. Never a portrait/bust/close-up, never a token or card frame.
- The image is the SAME character in an alternative form: PRESERVE the character's identity but APPLY the form's appearance.
- Respect the requested FACING (front or back) exactly.
- VISUAL, not literary. Compress lore into short visual tokens; never copy sentences.
- Inputs may be in another language; the final prompt MUST be in English.
- Muted dark-fantasy palette. Apply the character art direction. No text, no watermark, no UI.
- ALWAYS end with the fixed sprite style clause provided in the request.

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

/**
 * CharacterFormSessionSpriteAgent — builds the prompt for a FORM's 2.5D session
 * sprite (per facing), preserving base identity while applying the form's
 * appearance. Via the abstract {@link TextGenerationProvider} with a
 * deterministic fallback. No infrastructure knowledge.
 */
@Injectable()
export class CharacterFormSessionSpriteAgent {
  private readonly logger = new Logger(CharacterFormSessionSpriteAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: FormSpriteCampaignContext,
    base: FormSpriteBaseContext,
    form: FormSpriteFormContext,
    direction: SpriteDirection,
    options: FormSpriteOptions = {},
  ): Promise<FormSpritePrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, base, form, direction, options);
      } catch (error) {
        this.logger.warn(
          `LLM form sprite prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, base, form, direction, options);
  }

  private async buildWithLlm(
    campaign: FormSpriteCampaignContext,
    base: FormSpriteBaseContext,
    form: FormSpriteFormContext,
    direction: SpriteDirection,
    options: FormSpriteOptions,
  ): Promise<FormSpritePrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, base, form, direction, options),
      json: true,
      temperature: 0.6,
      maxTokens: 500,
    });
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as { imagePrompt?: string };
    let imagePrompt = (parsed.imagePrompt ?? '').trim();
    if (imagePrompt.length < 30) throw new Error('LLM returned a too-short imagePrompt');
    if (!/full[- ]body|sprite/i.test(imagePrompt)) {
      imagePrompt = `Full-body 2.5D isometric RPG character sprite. ${imagePrompt}`;
    }
    if (!/transparent background/i.test(imagePrompt)) {
      imagePrompt = `${imagePrompt} ${STYLE_CLAUSE}`;
    }
    return { imagePrompt, negativePrompt: NEGATIVE_PROMPT };
  }

  private buildUserPrompt(
    campaign: FormSpriteCampaignContext,
    base: FormSpriteBaseContext,
    form: FormSpriteFormContext,
    direction: SpriteDirection,
    options: FormSpriteOptions,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    add('Character name', base.name);
    add('Character title/archetype', base.title);
    add('Character short description', base.shortDescription);
    add('FORM name', form.name);
    add('FORM appearance (apply to the sprite)', form.appearanceDescription);
    add('Faction', options.factionName);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    add('Character art direction (apply)', options.artDirection);
    add('Facing (respect exactly)', FACING_CLAUSE[direction]);
    add('Input language (translate to English)', campaign.mainLanguage);
    add('Fixed sprite style clause (end the prompt with this)', STYLE_CLAUSE);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: FormSpriteCampaignContext,
    base: FormSpriteBaseContext,
    form: FormSpriteFormContext,
    direction: SpriteDirection,
    options: FormSpriteOptions,
  ): FormSpritePrompt {
    const archetype = base.title || firstSentence(base.shortDescription) || 'character';
    const parts: string[] = [
      `Full-body 2.5D isometric RPG character sprite of ${base.name} in their "${form.name}" form, ${FACING_CLAUSE[direction]}, based on a dark fantasy character design.`,
      `Preserve ${base.name} as ${archetype}, but apply this form appearance: ${firstSentence(form.appearanceDescription) || form.appearanceDescription}.`,
    ];
    if (options.factionName) parts.push(`Member of ${options.factionName}.`);
    const art = (options.artDirection ?? '').trim();
    if (art) parts.push(`Art direction: ${firstSentence(art) || art}.`);
    parts.push(STYLE_CLAUSE);
    return { imagePrompt: parts.join(' '), negativePrompt: NEGATIVE_PROMPT };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 180);
}
