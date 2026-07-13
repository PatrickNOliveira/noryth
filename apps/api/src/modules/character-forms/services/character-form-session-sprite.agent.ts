import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import {
  SPRITE_FRAMING_CLAUSE,
  SPRITE_NEGATIVE_PROMPT,
  SPRITE_STYLE_CLAUSE,
  withSpriteFraming,
} from '@shared/utils/sprite-prompt.util';
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

const FACING_CLAUSE: Record<SpriteDirection, string> = {
  FRONT: 'facing the camera (front view)',
  BACK: 'viewed from behind, facing away from the camera (back view)',
};

const SYSTEM_PROMPT = `You are a game artist for a dark-fantasy tactical RPG.
Turn a character and one of their ALTERNATIVE FORMS into ONE concise, visual, English prompt for a 2.5D ISOMETRIC CHARACTER SPRITE — a small full-body third-person game asset placed on a map. NOT a portrait, NOT a token, NOT a card.

Hard rules:
- FULL-BODY 2.5D isometric RPG character sprite (head to feet), third-person, readable at small size, clear silhouette, TRANSPARENT background. Never a portrait/bust/close-up, never a token or card frame.
- FRAMING IS CRITICAL: the ENTIRE character must fit inside the canvas with safe margins. The whole head — helmet, hood, hair, horns or crown — and the feet must be fully visible. Leave visible empty space ABOVE the head; the character must never touch the top edge or be cropped. Center it, occupying about 70–80% of the canvas height.
- The image is the SAME character in an alternative form: PRESERVE the character's identity but APPLY the form's appearance.
- Respect the requested FACING (front or back) exactly.
- VISUAL, not literary. Compress lore into short visual tokens; never copy sentences.
- Inputs may be in another language; the final prompt MUST be in English.
- Muted dark-fantasy palette. Apply the character art direction. No text, no watermark, no UI.
- ALWAYS end with the fixed sprite style clause AND the framing clause provided in the request.

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
    const raw = (parsed.imagePrompt ?? '').trim();
    if (raw.length < 30) throw new Error('LLM returned a too-short imagePrompt');
    // Guarantee the format AND the framing/headroom clauses are always present.
    return { imagePrompt: withSpriteFraming(raw), negativePrompt: SPRITE_NEGATIVE_PROMPT };
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
    add('Fixed sprite style clause (include this)', SPRITE_STYLE_CLAUSE);
    add('Fixed framing clause (MUST include — full head + headroom, no cropping)', SPRITE_FRAMING_CLAUSE);
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
    parts.push(SPRITE_STYLE_CLAUSE);
    return {
      imagePrompt: withSpriteFraming(parts.join(' ')),
      negativePrompt: SPRITE_NEGATIVE_PROMPT,
    };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 180);
}
