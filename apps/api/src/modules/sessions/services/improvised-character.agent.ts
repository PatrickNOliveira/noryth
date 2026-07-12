import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';

/** Campaign context handed to the improvisation model. */
export interface ImproviseCampaignContext {
  name: string;
  theme: string;
  tone: string;
  premise: string;
  mainLanguage: string;
  characterArtDirection: string;
}

/** The map the session is currently on, so the character fits the scene. */
export interface ImproviseMapContext {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  pointsOfInterest: string[];
}

/** A campaign attribute the model may suggest a value for (never invents new ones). */
export interface ImproviseAttributeContext {
  id: string;
  name: string;
  minValue: number;
  maxValue: number;
}

/** A campaign faction the model may assign the character to (by id). */
export interface ImproviseFactionContext {
  id: string;
  name: string;
}

/**
 * The master's partial character. Every field is optional — whatever the master
 * already wrote MUST be preserved verbatim; the model only fills the gaps.
 */
export interface ImprovisePartialCharacter {
  name?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  personality?: string;
  motivations?: string;
  secrets?: string;
  masterNotes?: string;
  factionId?: string | null;
  attributes?: Array<{ attributeId: string; value: number }>;
}

/** The narrative fields the model returns. Merge (user-wins) happens in the service. */
export interface ImprovisedCharacterResult {
  name: string;
  title: string;
  shortDescription: string;
  description: string;
  history: string;
  appearance: string;
  personality: string;
  motivations: string;
  secrets: string;
  masterNotes: string;
  /** Suggested campaign faction id, or null when none fits. */
  factionId: string | null;
  /** Suggested attribute values, echoing the campaign attribute ids. */
  attributes: Array<{ attributeId: string; value: number }>;
}

export interface ImproviseContext {
  campaign: ImproviseCampaignContext;
  map: ImproviseMapContext | null;
  attributes: ImproviseAttributeContext[];
  factions: ImproviseFactionContext[];
  partial: ImprovisePartialCharacter;
  instructions?: string;
}

const NARRATIVE_KEYS = [
  'name',
  'title',
  'shortDescription',
  'description',
  'history',
  'appearance',
  'personality',
  'motivations',
  'secrets',
  'masterNotes',
] as const;

const SYSTEM_PROMPT = `You are helping a tabletop RPG game master improvise a coherent character during an ACTIVE session.

Your job: propose a complete, believable character that fits the campaign, the current map/scene, its factions and its attributes.

Hard rules:
- The master may have already written some fields ("Provided by the master"). Treat those as FIXED CANON. Never contradict them; build the rest of the character around them.
- Write the narrative fields in the campaign's main language.
- Keep it grounded and usable at the table: concise, evocative, not purple prose.
- "secrets" and "masterNotes" are master-only — put GM-facing hooks/twists there.
- Attributes: ONLY use the attribute ids given below, and keep each value within its stated range. Do NOT invent attributes. If unsure, pick a sensible mid-range value. Echo the exact attributeId for each.
- If a faction fits, set factionId to one of the given faction ids; otherwise omit it.

Respond with a STRICT JSON object, no markdown, exactly these keys:
{
  "name": string,
  "title": string,
  "shortDescription": string,
  "description": string,
  "history": string,
  "appearance": string,
  "personality": string,
  "motivations": string,
  "secrets": string,
  "masterNotes": string,
  "factionId": string | null,
  "attributes": [{ "attributeId": string, "value": number }]
}`;

/**
 * ImprovisedCharacterAgent — application-level agent that turns a master's
 * partial character (plus the live campaign/map context) into a full, coherent
 * character proposal via the abstract {@link TextGenerationProvider}. It only
 * PROPOSES; the authoritative "master fields always win" merge and the attribute
 * clamping live in the service — never trust the prompt alone. Mirrors
 * {@link CharacterPortraitAgent}.
 */
@Injectable()
export class ImprovisedCharacterAgent {
  private readonly logger = new Logger(ImprovisedCharacterAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  /** Whether AI completion is available at all (no key ⇒ manual-only). */
  isConfigured(): boolean {
    return this.llm.isConfigured();
  }

  async complete(context: ImproviseContext): Promise<ImprovisedCharacterResult> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(context),
      json: true,
      temperature: 0.8,
      maxTokens: 1200,
    });
    return this.parse(text);
  }

  private buildUserPrompt(context: ImproviseContext): string {
    const { campaign, map, attributes, factions, partial, instructions } =
      context;
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };

    lines.push('# Campaign');
    add('Name', campaign.name);
    add('Theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Tone', campaign.tone.replace(/[-_]/g, ' '));
    add('Premise', campaign.premise);
    add('Character art direction', campaign.characterArtDirection);
    add('Main language (write in this language)', campaign.mainLanguage);

    if (map) {
      lines.push('', '# Current scene / map');
      add('Map', map.name);
      add('Kind', map.type);
      add('Summary', map.shortDescription);
      add('Details', map.description);
      if (map.pointsOfInterest.length) {
        add('Points of interest', map.pointsOfInterest.join(', '));
      }
    }

    if (factions.length) {
      lines.push('', '# Factions (assign by id if fitting)');
      factions.forEach((f) => lines.push(`- ${f.name} (id: ${f.id})`));
    }

    if (attributes.length) {
      lines.push('', '# Attributes (use these ids, respect the ranges)');
      attributes.forEach((a) =>
        lines.push(
          `- ${a.name} (id: ${a.id}, range ${a.minValue}..${a.maxValue})`,
        ),
      );
    }

    lines.push('', '# Provided by the master (FIXED — do not change)');
    let anyProvided = false;
    for (const key of NARRATIVE_KEYS) {
      const v = (partial[key] ?? '').toString().trim();
      if (v) {
        anyProvided = true;
        lines.push(`${key}: ${v}`);
      }
    }
    if (partial.factionId) {
      anyProvided = true;
      lines.push(`factionId: ${partial.factionId}`);
    }
    if (partial.attributes?.length) {
      anyProvided = true;
      lines.push(
        `attributes already set by the master: ${partial.attributes
          .map((a) => `${a.attributeId}=${a.value}`)
          .join(', ')}`,
      );
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

  private parse(raw: string): ImprovisedCharacterResult {
    const cleaned = raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Improvisation JSON parse failed: ${(error as Error).message}`);
      throw new Error('LLM returned invalid JSON for the improvised character');
    }

    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
    const name = str(parsed.name);
    if (!name) {
      throw new Error('LLM returned an improvised character without a name');
    }

    const attributes: Array<{ attributeId: string; value: number }> = [];
    if (Array.isArray(parsed.attributes)) {
      for (const item of parsed.attributes) {
        if (item && typeof item === 'object') {
          const attributeId = str((item as Record<string, unknown>).attributeId);
          const value = Number((item as Record<string, unknown>).value);
          if (attributeId && Number.isFinite(value)) {
            attributes.push({ attributeId, value });
          }
        }
      }
    }

    return {
      name,
      title: str(parsed.title),
      shortDescription: str(parsed.shortDescription),
      description: str(parsed.description),
      history: str(parsed.history),
      appearance: str(parsed.appearance),
      personality: str(parsed.personality),
      motivations: str(parsed.motivations),
      secrets: str(parsed.secrets),
      masterNotes: str(parsed.masterNotes),
      factionId: str(parsed.factionId) || null,
      attributes,
    };
  }
}
