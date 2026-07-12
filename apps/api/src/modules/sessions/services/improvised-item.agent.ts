import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import { buildLanguageRequirement } from '@shared/utils/language.util';

/** Campaign context handed to the item-improvisation model. */
export interface ImproviseItemCampaignContext {
  name: string;
  theme: string;
  tone: string;
  premise: string;
  mainLanguage: string;
  itemArtDirection: string;
}

/** The map the session is currently on, so the item fits the scene. */
export interface ImproviseItemMapContext {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  pointsOfInterest: string[];
  charactersPresent: string[];
}

/**
 * The master's partial item. Every field is optional — whatever the master
 * already wrote MUST be preserved verbatim; the model only fills the gaps.
 */
export interface ImprovisePartialItem {
  name?: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  effectDescription?: string;
  rulesText?: string;
  masterNotes?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
}

/** The fields the model returns. Merge (user-wins) happens in the service. */
export interface ImprovisedItemResult {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  effectDescription: string;
  rulesText: string;
  masterNotes: string;
  isUnique: boolean | null;
  isVisibleToPlayers: boolean | null;
}

export interface ImproviseItemContext {
  campaign: ImproviseItemCampaignContext;
  map: ImproviseItemMapContext | null;
  factions: string[];
  allowedTypes: readonly string[];
  partial: ImprovisePartialItem;
  instructions?: string;
  /** English name of the language the AI must write completions in. */
  languageName: string;
}

const NARRATIVE_KEYS = [
  'name',
  'type',
  'shortDescription',
  'description',
  'history',
  'appearance',
  'effectDescription',
  'rulesText',
  'masterNotes',
] as const;

const SYSTEM_PROMPT = `You are helping a tabletop RPG game master improvise a coherent item during an ACTIVE session.

Your job: propose a complete, believable item that fits the campaign, the current map/scene, its factions and its lore.

Hard rules:
- The master may have already written some fields ("Provided by the master"). Treat those as FIXED CANON. Never contradict them; build the rest of the item around them.
- Write ALL generated text fields in the TARGET LANGUAGE stated in the "Language requirement" section of the user message. Never default to Portuguese. The campaign context may be in another language, but your output must use the target language.
- Keep it grounded and usable at the table: concise, evocative, not purple prose.
- "masterNotes" is master-only — put GM-facing secrets/hooks there.
- "type" MUST be one of the allowed item types listed below. If unsure, use OTHER.
- "effectDescription" is the narrative effect; "rulesText" is any light mechanical note (keep it simple — no full rules system).
- Return isUnique and isVisibleToPlayers as booleans. Default improvised items to isVisibleToPlayers=false (they may hide secrets).

Respond with a STRICT JSON object, no markdown, exactly these keys:
{
  "name": string,
  "type": string,
  "shortDescription": string,
  "description": string,
  "history": string,
  "appearance": string,
  "effectDescription": string,
  "rulesText": string,
  "masterNotes": string,
  "isUnique": boolean,
  "isVisibleToPlayers": boolean
}`;

/**
 * ImprovisedItemAgent — turns a master's partial item (plus the live
 * campaign/map context) into a full, coherent item proposal via the abstract
 * {@link TextGenerationProvider}. It only PROPOSES; the authoritative
 * "master fields always win" merge and type validation live in the service —
 * never trusting the prompt alone. Mirrors {@link ItemImageAgent} and
 * {@link ImprovisedCharacterAgent}.
 */
@Injectable()
export class ImprovisedItemAgent {
  private readonly logger = new Logger(ImprovisedItemAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  /** Whether AI completion is available at all (no key ⇒ manual-only). */
  isConfigured(): boolean {
    return this.llm.isConfigured();
  }

  async complete(context: ImproviseItemContext): Promise<ImprovisedItemResult> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(context),
      json: true,
      temperature: 0.8,
      maxTokens: 1000,
    });
    return this.parse(text);
  }

  private buildUserPrompt(context: ImproviseItemContext): string {
    const { campaign, map, factions, allowedTypes, partial, instructions } =
      context;
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };

    lines.push(buildLanguageRequirement(context.languageName), '');
    lines.push('# Campaign');
    add('Name', campaign.name);
    add('Theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Tone', campaign.tone.replace(/[-_]/g, ' '));
    add('Premise', campaign.premise);
    add('Item art direction', campaign.itemArtDirection);

    if (map) {
      lines.push('', '# Current scene / map');
      add('Map', map.name);
      add('Kind', map.type);
      add('Summary', map.shortDescription);
      add('Details', map.description);
      if (map.pointsOfInterest.length) {
        add('Points of interest', map.pointsOfInterest.join(', '));
      }
      if (map.charactersPresent.length) {
        add('Characters present', map.charactersPresent.join(', '));
      }
    }

    if (factions.length) {
      lines.push('', '# Factions');
      factions.forEach((f) => lines.push(`- ${f}`));
    }

    lines.push('', '# Allowed item types', allowedTypes.join(', '));

    lines.push('', '# Provided by the master (FIXED — do not change)');
    let anyProvided = false;
    for (const key of NARRATIVE_KEYS) {
      const v = (partial[key] ?? '').toString().trim();
      if (v) {
        anyProvided = true;
        lines.push(`${key}: ${v}`);
      }
    }
    if (partial.isUnique !== undefined) {
      anyProvided = true;
      lines.push(`isUnique: ${partial.isUnique}`);
    }
    if (partial.isVisibleToPlayers !== undefined) {
      anyProvided = true;
      lines.push(`isVisibleToPlayers: ${partial.isVisibleToPlayers}`);
    }
    if (!anyProvided) lines.push('(nothing yet — improvise from the context)');

    if (instructions?.trim()) {
      lines.push('', '# Master instructions', instructions.trim());
    }

    lines.push(
      '',
      'Return the JSON object as instructed, completing every field coherently.',
    );
    return lines.join('\n');
  }

  private parse(raw: string): ImprovisedItemResult {
    const cleaned = raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Item improvisation JSON parse failed: ${(error as Error).message}`);
      throw new Error('LLM returned invalid JSON for the improvised item');
    }

    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
    const bool = (v: unknown): boolean | null =>
      typeof v === 'boolean' ? v : null;

    const name = str(parsed.name);
    if (!name) {
      throw new Error('LLM returned an improvised item without a name');
    }

    return {
      name,
      type: str(parsed.type),
      shortDescription: str(parsed.shortDescription),
      description: str(parsed.description),
      history: str(parsed.history),
      appearance: str(parsed.appearance),
      effectDescription: str(parsed.effectDescription),
      rulesText: str(parsed.rulesText),
      masterNotes: str(parsed.masterNotes),
      isUnique: bool(parsed.isUnique),
      isVisibleToPlayers: bool(parsed.isVisibleToPlayers),
    };
  }
}
