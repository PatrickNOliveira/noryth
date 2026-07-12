import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import {
  PortraitCampaignContext,
  PortraitFactionContext,
  CharacterPortraitPrompt,
} from '@modules/characters/services/character-portrait.agent';

export interface FormBaseCharacterContext {
  name: string;
  title: string;
  shortDescription: string;
  description: string;
}

export interface FormContext {
  name: string;
  shortDescription: string;
  appearanceDescription: string;
}

export interface FormPromptOptions {
  artDirection?: string;
  adjustments?: string;
  ignoreArtDirection?: boolean;
}

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
Turn a character and one of their ALTERNATIVE FORMS into ONE concise, visual, English prompt for a single-character illustration of that form.

Hard rules:
- The image is the SAME character in an alternative form. PRESERVE the character's identity (who they are, archetype, role, faction bearing) but TRANSFORM their appearance to match the form's appearance description.
- VISUAL, not literary. Compress lore into short visual tokens; never copy sentences.
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- Describe ONE character: body/build, face, skin, clothing, notable marks, posture, mood, atmosphere and lighting — all shaped by the FORM's appearance.
- Reflect the campaign theme/tone; muted dark-fantasy palette unless told otherwise. No text, no watermark, no modern clothing.
- Apply the global character art direction unless told to ignore it. The master's adjustments override conflicts.

Structure as a single natural sentence in this spirit:
"Dark fantasy character illustration of [name] in their [form name] form. Preserve the identity of [name] as [archetype/base], but transform the appearance: [form appearance]. [Faction bearing if any]. [Mood & atmosphere]. [Art-direction style]. No text, no watermark."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

/**
 * CharacterFormImageAgent — builds the image prompt for a character's alternative
 * FORM, preserving the base identity while applying the form's appearance. Via
 * the abstract {@link TextGenerationProvider} with a deterministic fallback.
 * Mirrors CharacterPortraitAgent; no infrastructure knowledge.
 */
@Injectable()
export class CharacterFormImageAgent {
  private readonly logger = new Logger(CharacterFormImageAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: PortraitCampaignContext,
    base: FormBaseCharacterContext,
    form: FormContext,
    faction?: PortraitFactionContext,
    options: FormPromptOptions = {},
  ): Promise<CharacterPortraitPrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, base, form, faction, options);
      } catch (error) {
        this.logger.warn(
          `LLM form prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, base, form, faction, options);
  }

  private async buildWithLlm(
    campaign: PortraitCampaignContext,
    base: FormBaseCharacterContext,
    form: FormContext,
    faction: PortraitFactionContext | undefined,
    options: FormPromptOptions,
  ): Promise<CharacterPortraitPrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, base, form, faction, options),
      json: true,
      temperature: 0.7,
      maxTokens: 600,
    });
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as { imagePrompt?: string };
    const imagePrompt = (parsed.imagePrompt ?? '').trim();
    if (imagePrompt.length < 40) {
      throw new Error('LLM returned an empty or too-short imagePrompt');
    }
    return { imagePrompt, negativePrompt: STANDARD_NEGATIVE_PROMPT };
  }

  private buildUserPrompt(
    campaign: PortraitCampaignContext,
    base: FormBaseCharacterContext,
    form: FormContext,
    faction: PortraitFactionContext | undefined,
    options: FormPromptOptions,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    add('Character name', base.name);
    add('Character title/archetype', base.title);
    add('Character short description', base.shortDescription);
    add('Character description', base.description);
    add('FORM name', form.name);
    add('FORM short description', form.shortDescription);
    add('FORM appearance (transform the character into this)', form.appearanceDescription);
    if (faction) {
      add('Faction', faction.name);
      add('Faction identity', faction.identity);
      add('Faction colors', faction.colors);
    }
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    if (options.ignoreArtDirection) {
      add('Global art direction', 'IGNORE the campaign art direction for this generation');
    } else {
      add('Global character art direction (apply)', options.artDirection);
    }
    add('Master adjustments (highest priority, override conflicts)', options.adjustments);
    add('Input language (translate to English)', campaign.mainLanguage);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: PortraitCampaignContext,
    base: FormBaseCharacterContext,
    form: FormContext,
    faction: PortraitFactionContext | undefined,
    options: FormPromptOptions,
  ): CharacterPortraitPrompt {
    const archetype = base.title || firstSentence(base.shortDescription) || 'character';
    const parts: string[] = [
      `Dark fantasy character illustration of ${base.name} in their "${form.name}" form.`,
      `Preserve the identity of ${base.name} as ${archetype}, but transform the appearance: ${firstSentence(form.appearanceDescription) || form.appearanceDescription}.`,
    ];
    const brief = firstSentence(form.shortDescription);
    if (brief) parts.push(`${brief}.`);
    if (faction) parts.push(`Bearing of ${faction.name}.`);
    parts.push(
      `Realistic dark fantasy illustration, dramatic lighting, muted palette, ${campaign.tone.replace(/[-_]/g, ' ') || 'grim'} mood.`,
    );
    const art = (options.artDirection ?? '').trim();
    if (!options.ignoreArtDirection && art) {
      parts.push(`Art direction: ${firstSentence(art) || art}.`);
    }
    const adjustments = (options.adjustments ?? '').trim();
    if (adjustments) parts.push(`Requested changes (apply): ${adjustments}.`);
    parts.push('Single character illustration, cohesive style. No text, no watermark.');
    return { imagePrompt: parts.join(' '), negativePrompt: STANDARD_NEGATIVE_PROMPT };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 200);
}
