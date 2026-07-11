import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';

export interface ItemPromptCampaignContext {
  name: string;
  theme: string;
  tone: string;
  mainLanguage: string;
}

export interface ItemPromptContext {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  effectDescription: string;
}

export interface ItemPromptOptions {
  artDirection?: string;
  adjustments?: string;
  ignoreArtDirection?: boolean;
}

export interface ItemImagePrompt {
  imagePrompt: string;
  negativePrompt: string;
}

/** Standardized negative prompt for item images. */
const STANDARD_NEGATIVE_PROMPT = [
  'text',
  'letters',
  'words',
  'typography',
  'watermark',
  'signature',
  'UI elements',
  'modern logo',
  'product mockup',
  'plastic',
  'sci-fi technology',
  'futuristic design',
  'bright saturated colors',
  'cartoon',
  'anime',
  'childish style',
  'blurry',
  'low quality',
  'cluttered background',
  'human hands',
  'full character',
  'photorealistic product advertisement',
].join(', ');

const SYSTEM_PROMPT = `You are an expert prop/concept artist for a dark-fantasy tabletop RPG.
Turn an item's lore into ONE concise, visual, English prompt for a single ISOLATED OBJECT illustration.

Hard rules:
- VISUAL, not literary. Never copy sentences/paragraphs of lore — compress into short visual tokens.
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- Depict ONE isolated object on a dark neutral background. No hands, no character, no scene.
- Layer in THIS priority, rebuilding ONE coherent prompt: 1) item type & name. 2) appearance (material, shape, marks). 3) mood implied by its effect/history. 4) campaign theme/tone. 5) global item art direction (unless ignored). 6) the master's adjustments (override conflicts). 7) explicit exceptions.
- No text, no labels, no watermark.

Structure as a single natural sentence in this spirit:
"Dark fantasy item illustration of [item], [material/shape/marks]. [Mood]. [Art direction/palette]. Isolated object on dark neutral background, realistic RPG item art. No text, no watermark."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

/**
 * ItemImageAgent — builds item image prompts from campaign + item + global item
 * art direction + adjustments, via an abstract {@link TextGenerationProvider}
 * with a deterministic fallback. Mirrors the faction/character/map agents.
 */
@Injectable()
export class ItemImageAgent {
  private readonly logger = new Logger(ItemImageAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: ItemPromptCampaignContext,
    item: ItemPromptContext,
    options: ItemPromptOptions = {},
  ): Promise<ItemImagePrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, item, options);
      } catch (error) {
        this.logger.warn(
          `LLM item prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, item, options);
  }

  private async buildWithLlm(
    campaign: ItemPromptCampaignContext,
    item: ItemPromptContext,
    options: ItemPromptOptions,
  ): Promise<ItemImagePrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, item, options),
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
    campaign: ItemPromptCampaignContext,
    item: ItemPromptContext,
    options: ItemPromptOptions,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    add('Item name', item.name);
    add('Item type', item.type);
    add('Appearance', item.appearance);
    add('Short description', item.shortDescription);
    add('Description', item.description);
    add('Narrative effect', item.effectDescription);
    add('History', item.history);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    if (options.ignoreArtDirection) {
      add('Global item art direction', 'IGNORE the campaign item art direction');
    } else {
      add('Global item art direction (apply)', options.artDirection);
    }
    add('Master adjustments (highest priority, override conflicts)', options.adjustments);
    add('Input language (translate to English)', campaign.mainLanguage);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: ItemPromptCampaignContext,
    item: ItemPromptContext,
    options: ItemPromptOptions,
  ): ItemImagePrompt {
    const typeLabel = (item.type || 'object').toLowerCase().replace(/_/g, ' ');
    const parts: string[] = [
      `Dark fantasy item illustration of ${item.name}, a ${typeLabel}.`,
    ];
    const look = firstSentence(item.appearance || item.shortDescription || item.description);
    if (look) parts.push(`${look}.`);
    const mood = firstSentence(item.effectDescription);
    if (mood) parts.push(`Evokes: ${mood}.`);
    parts.push(
      `Aged materials, gothic medieval craftsmanship, ${campaign.tone.replace(/[-_]/g, ' ') || 'grim'} tone.`,
    );
    const art = (options.artDirection ?? '').trim();
    if (!options.ignoreArtDirection && art) {
      parts.push(`Art direction: ${firstSentence(art) || art}.`);
    }
    const adjustments = (options.adjustments ?? '').trim();
    if (adjustments) parts.push(`Requested changes (apply): ${adjustments}.`);
    parts.push(
      'Isolated object on dark neutral background, realistic RPG item art, muted palette. No text, no watermark.',
    );
    return { imagePrompt: parts.join(' '), negativePrompt: STANDARD_NEGATIVE_PROMPT };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 170);
}
