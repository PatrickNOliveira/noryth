import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import { SpriteDirection } from '../session-character.constants';

export interface SpriteCampaignContext {
  name: string;
  theme: string;
  tone: string;
  mainLanguage: string;
}

export interface SpriteCharacterContext {
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  appearance: string;
}

export interface SpriteBuildOptions {
  /** Campaign-wide character art direction. */
  artDirection?: string;
  factionName?: string;
}

export interface CharacterSpritePrompt {
  imagePrompt: string;
  negativePrompt: string;
}

/** Negative prompt — steers away from portraits, tokens, cards and cropped bodies. */
const NEGATIVE_PROMPT = [
  'portrait',
  'bust',
  'close-up',
  'face-only',
  'circular token',
  'token border',
  'card frame',
  'UI',
  'text',
  'letters',
  'watermark',
  'signature',
  'background scene',
  'landscape',
  'large illustration',
  '3d render',
  'realistic photo',
  'anime chibi',
  'oversized head',
  'cropped body',
  'missing legs',
  'cut off feet',
  'blurry',
  'low quality',
  'multiple characters',
  'extra limbs',
  'distorted anatomy',
].join(', ');

/** The clause that fixes the asset type + framing; always ends the prompt. */
const SPRITE_STYLE_CLAUSE =
  'Third-person game asset, Ragnarok-like readability, small tactical RPG sprite, full body visible from head to feet, clear silhouette, transparent background, isolated character sprite, no base, no circular token, no portrait frame. Dark fantasy medieval style, muted cold colors, readable details, designed to be placed on an isometric game map.';

const FACING_CLAUSE: Record<SpriteDirection, string> = {
  FRONT: 'facing the camera (front view)',
  BACK: 'viewed from behind, facing away from the camera (back view)',
};

const SYSTEM_PROMPT = `You are a game artist for a dark-fantasy tactical RPG.
Turn a character's lore into ONE concise, visual, English prompt for a 2.5D ISOMETRIC CHARACTER SPRITE — a small full-body third-person game asset placed on a map. NOT a portrait, NOT a token, NOT a card.

Hard rules:
- The output is a FULL-BODY 2.5D isometric RPG character sprite (head to feet visible), third-person, readable at small size, with a clear silhouette and a TRANSPARENT background. Never a portrait/bust/close-up, never a circular token or card frame, never a big illustration or a background scene.
- Respect the requested FACING (front or back) exactly.
- VISUAL, not literary. Compress lore into short visual tokens; never copy sentences.
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- Derive the look from the character's appearance/description (build, clothing, gear, colors), the faction if any, and the campaign art direction/tone. Muted dark-fantasy palette.
- ALWAYS end with the fixed sprite style clause provided in the request.
- No text, no watermark, no UI.

Structure as a single natural sentence in this spirit:
"Full-body 2.5D isometric RPG character sprite of [name], [facing], based on a dark fantasy character design. [Build, clothing, gear, colors]. [Sprite style clause]."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

/**
 * CharacterSessionSpriteAgent — builds the prompt for a character's 2.5D session
 * sprite (per facing) via the abstract {@link TextGenerationProvider}, with a
 * deterministic fallback. Targets a full-body isometric game asset, never a
 * portrait. No infrastructure knowledge here.
 */
@Injectable()
export class CharacterSessionSpriteAgent {
  private readonly logger = new Logger(CharacterSessionSpriteAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: SpriteCampaignContext,
    character: SpriteCharacterContext,
    direction: SpriteDirection,
    options: SpriteBuildOptions = {},
  ): Promise<CharacterSpritePrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, character, direction, options);
      } catch (error) {
        this.logger.warn(
          `LLM sprite prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, character, direction, options);
  }

  private async buildWithLlm(
    campaign: SpriteCampaignContext,
    character: SpriteCharacterContext,
    direction: SpriteDirection,
    options: SpriteBuildOptions,
  ): Promise<CharacterSpritePrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, character, direction, options),
      json: true,
      temperature: 0.6,
      maxTokens: 500,
    });
    const cleaned = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { imagePrompt?: string };
    let imagePrompt = (parsed.imagePrompt ?? '').trim();
    if (imagePrompt.length < 30) {
      throw new Error('LLM returned an empty or too-short imagePrompt');
    }
    if (!/full[- ]body|sprite/i.test(imagePrompt)) {
      imagePrompt = `Full-body 2.5D isometric RPG character sprite. ${imagePrompt}`;
    }
    if (!/transparent background/i.test(imagePrompt)) {
      imagePrompt = `${imagePrompt} ${SPRITE_STYLE_CLAUSE}`;
    }
    return { imagePrompt, negativePrompt: NEGATIVE_PROMPT };
  }

  private buildUserPrompt(
    campaign: SpriteCampaignContext,
    character: SpriteCharacterContext,
    direction: SpriteDirection,
    options: SpriteBuildOptions,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    add('Character name', character.name);
    add('Title/archetype', character.title);
    add('Short description', character.shortDescription);
    add('Description', character.description);
    add('Appearance', character.appearance);
    add('Faction', options.factionName);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    add('Character art direction (apply)', options.artDirection);
    add('Facing (respect exactly)', FACING_CLAUSE[direction]);
    add('Input language (translate to English)', campaign.mainLanguage);
    add('Fixed sprite style clause (end the prompt with this)', SPRITE_STYLE_CLAUSE);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: SpriteCampaignContext,
    character: SpriteCharacterContext,
    direction: SpriteDirection,
    options: SpriteBuildOptions,
  ): CharacterSpritePrompt {
    const parts: string[] = [
      `Full-body 2.5D isometric RPG character sprite of ${character.name}, ${FACING_CLAUSE[direction]}, based on a dark fantasy character design.`,
    ];
    const look = firstSentence(character.appearance || character.description);
    if (look) parts.push(`${look}.`);
    if (options.factionName) parts.push(`Member of ${options.factionName}.`);
    const art = (options.artDirection ?? '').trim();
    if (art) parts.push(`Art direction: ${firstSentence(art) || art}.`);
    parts.push(SPRITE_STYLE_CLAUSE);
    return { imagePrompt: parts.join(' '), negativePrompt: NEGATIVE_PROMPT };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 160);
}
