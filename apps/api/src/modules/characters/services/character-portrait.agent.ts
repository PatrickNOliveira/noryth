import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';

export interface PortraitCampaignContext {
  name: string;
  theme: string;
  tone: string;
  mainLanguage: string;
}

export interface PortraitFactionContext {
  name: string;
  identity: string;
  memberTraits: string;
  colors: string;
  recurringElements: string;
}

export interface PortraitCharacterContext {
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  appearance: string;
  personality: string;
  history: string;
}

export interface CharacterPortraitPrompt {
  imagePrompt: string;
  negativePrompt: string;
}

export interface PortraitBuildOptions {
  /** Campaign-wide global art direction to fold in (unless ignored). */
  artDirection?: string;
  /** Master's change request for this specific generation. */
  adjustments?: string;
  /** When true, the global art direction is not applied. */
  ignoreArtDirection?: boolean;
}

/** Standardized, always-applied negative prompt for character portraits. */
const STANDARD_NEGATIVE_PROMPT = [
  'text',
  'letters',
  'words',
  'typography',
  'watermark',
  'signature',
  'UI elements',
  'modern clothing',
  'cartoon',
  'anime',
  'bright saturated colors',
  'low quality',
  'blurry',
  'distorted anatomy',
  'extra limbs',
  'inconsistent style',
].join(', ');

const SYSTEM_PROMPT = `You are an expert concept artist for a dark-fantasy tabletop RPG.
Turn a character's lore into ONE concise, visual, English prompt for a single-character PORTRAIT.

Hard rules:
- VISUAL, not literary. Never copy sentences/paragraphs of lore — compress into short visual tokens.
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- Describe ONE character: body/build, face, hair, skin, clothing, notable marks/weapons, posture, mood, atmosphere and lighting.
- If a faction is given, weave its cultural/physical/visual identity into the character (colors, motifs, bearing).
- Reflect the campaign theme and tone. Keep it a portrait, not a busy scene; muted, dark-fantasy palette unless told otherwise.
- No text, no watermark, no modern clothing.

Layer the prompt in THIS priority order, rebuilding ONE coherent prompt (never a raw concatenation):
1. Character essentials (name, archetype/title). 2. Appearance & description. 3. Faction identity, if any. 4. Campaign theme/tone. 5. Global art direction (campaign-wide visual style), unless told to ignore it. 6. The master's specific adjustments for this generation — these OVERRIDE conflicting earlier layers. 7. Explicit exceptions requested by the master.

When adjustments are given, preserve the character's identity and apply the changes coherently (do not just append them). When told to IGNORE the global art direction, do not apply it at all — the adjustments/character define the style instead.

Structure as a single natural sentence in this spirit:
"Dark fantasy character portrait of [name], [archetype/title]. [Build & face & hair & skin]. [Clothing & marks & weapons]. [Faction identity if any]. [Posture & mood]. [Atmosphere & lighting]. [Global art-direction style]. [Adjustments applied]. No text, no watermark."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

/**
 * CharacterPortraitAgent — application-level agent that turns a character (plus
 * its optional faction and the campaign context) into a visual portrait prompt.
 * Interprets the lore into visual decisions via an abstract
 * {@link TextGenerationProvider}, with a deterministic fallback so creation
 * always works even without an LLM configured. Mirrors FactionSymbolAgent.
 */
@Injectable()
export class CharacterPortraitAgent {
  private readonly logger = new Logger(CharacterPortraitAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: PortraitCampaignContext,
    character: PortraitCharacterContext,
    faction?: PortraitFactionContext,
    options: PortraitBuildOptions = {},
  ): Promise<CharacterPortraitPrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, character, faction, options);
      } catch (error) {
        this.logger.warn(
          `LLM portrait prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, character, faction, options);
  }

  private async buildWithLlm(
    campaign: PortraitCampaignContext,
    character: PortraitCharacterContext,
    faction: PortraitFactionContext | undefined,
    options: PortraitBuildOptions,
  ): Promise<CharacterPortraitPrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, character, faction, options),
      json: true,
      temperature: 0.7,
      maxTokens: 600,
    });
    const cleaned = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { imagePrompt?: string };
    const imagePrompt = (parsed.imagePrompt ?? '').trim();
    if (imagePrompt.length < 40) {
      throw new Error('LLM returned an empty or too-short imagePrompt');
    }
    return { imagePrompt, negativePrompt: STANDARD_NEGATIVE_PROMPT };
  }

  private buildUserPrompt(
    campaign: PortraitCampaignContext,
    character: PortraitCharacterContext,
    faction: PortraitFactionContext | undefined,
    options: PortraitBuildOptions,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    add('Name', character.name);
    add('Title', character.title);
    add('Short description', character.shortDescription);
    add('Description', character.description);
    add('Appearance', character.appearance);
    add('Personality', character.personality);
    add('History', character.history);
    if (faction) {
      add('Faction', faction.name);
      add('Faction identity', faction.identity);
      add('Faction common member traits', faction.memberTraits);
      add('Faction colors', faction.colors);
      add('Faction recurring visual elements', faction.recurringElements);
    }
    add('Campaign', campaign.name);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    if (options.ignoreArtDirection) {
      add(
        'Global art direction',
        'IGNORE the campaign art direction for this generation',
      );
    } else {
      add('Global art direction (apply to the whole portrait)', options.artDirection);
    }
    add(
      'Master adjustments (highest priority, override conflicts)',
      options.adjustments,
    );
    add('Input language (translate to English)', campaign.mainLanguage);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: PortraitCampaignContext,
    character: PortraitCharacterContext,
    faction: PortraitFactionContext | undefined,
    options: PortraitBuildOptions,
  ): CharacterPortraitPrompt {
    const genre = /noble|court|necro|goth|grim|dark|horror/i.test(
      `${campaign.tone} ${campaign.theme}`,
    )
      ? 'dark fantasy'
      : 'dark fantasy';
    const title = character.title ? `, ${character.title}` : '';
    const parts: string[] = [
      `${cap(genre)} character portrait of ${character.name}${title}.`,
    ];
    const brief = firstSentence(
      character.shortDescription || character.description,
    );
    if (brief) parts.push(`${brief}.`);
    if (character.appearance)
      parts.push(`Appearance: ${firstSentence(character.appearance)}.`);
    if (character.personality)
      parts.push(`Bearing: ${firstSentence(character.personality)}.`);
    if (faction) {
      const factionBits = [faction.identity, faction.memberTraits, faction.colors]
        .map((s) => firstSentence(s))
        .filter(Boolean)
        .join(', ');
      parts.push(
        `Belongs to ${faction.name}${factionBits ? `: ${factionBits}` : ''}.`,
      );
    }
    parts.push(
      `Realistic dark fantasy illustration, dramatic lighting, muted palette, ${campaign.tone.replace(/[-_]/g, ' ') || 'grim'} mood.`,
    );
    const artDirection = (options.artDirection ?? '').trim();
    if (!options.ignoreArtDirection && artDirection) {
      parts.push(`Art direction: ${firstSentence(artDirection) || artDirection}.`);
    }
    const adjustments = (options.adjustments ?? '').trim();
    if (adjustments) {
      parts.push(`Requested changes (apply): ${adjustments}.`);
    }
    parts.push('Single character portrait, cohesive style. No text, no watermark.');
    return {
      imagePrompt: parts.join(' '),
      negativePrompt: STANDARD_NEGATIVE_PROMPT,
    };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 160);
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
