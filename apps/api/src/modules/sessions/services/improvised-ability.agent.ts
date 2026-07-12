import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import { buildLanguageRequirement } from '@shared/utils/language.util';

/** Campaign context handed to the ability-improvisation model. */
export interface ImproviseAbilityCampaignContext {
  name: string;
  theme: string;
  tone: string;
  premise: string;
  mainLanguage: string;
}

export interface ImproviseAbilityMapContext {
  name: string;
  type: string;
  shortDescription: string;
  pointsOfInterest: string[];
  charactersPresent: string[];
}

/** The character the master is focusing on (optional), plus its active form. */
export interface ImproviseAbilityCharacterContext {
  name: string;
  shortDescription: string;
  activeFormName?: string;
  activeFormAppearance?: string;
}

/**
 * The master's partial ability. Every field is optional — whatever the master
 * already wrote MUST be preserved verbatim; the model only fills the gaps.
 */
export interface ImprovisePartialAbility {
  name?: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  effectDescription?: string;
  rulesText?: string;
  costDescription?: string;
  limitationDescription?: string;
  masterNotes?: string;
  isUnique?: boolean;
  isVisibleToPlayers?: boolean;
}

/** The fields the model returns. Merge (user-wins) happens in the service. */
export interface ImprovisedAbilityResult {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  effectDescription: string;
  rulesText: string;
  costDescription: string;
  limitationDescription: string;
  masterNotes: string;
  isUnique: boolean | null;
  isVisibleToPlayers: boolean | null;
}

export interface ImproviseAbilityContext {
  campaign: ImproviseAbilityCampaignContext;
  map: ImproviseAbilityMapContext | null;
  selectedCharacter: ImproviseAbilityCharacterContext | null;
  factions: string[];
  existingAbilities: string[];
  attributes: string[];
  allowedTypes: readonly string[];
  partial: ImprovisePartialAbility;
  instructions?: string;
  /** English name of the language the AI must write completions in. */
  languageName: string;
}

const NARRATIVE_KEYS = [
  'name',
  'type',
  'shortDescription',
  'description',
  'effectDescription',
  'rulesText',
  'costDescription',
  'limitationDescription',
  'masterNotes',
] as const;

const SYSTEM_PROMPT = `You are helping a tabletop RPG game master improvise a coherent ability during an ACTIVE session.

Your job: propose a complete, believable ability that fits the campaign, the current scene, the focused character (and its active form, if any) and the existing lore.

Hard rules:
- The master may have already written some fields ("Provided by the master"). Treat those as FIXED CANON. Never contradict them; build the rest of the ability around them.
- Write ALL generated text fields in the TARGET LANGUAGE stated in the "Language requirement" section of the user message. Never default to Portuguese. The campaign context may be in another language, but your output must use the target language.
- Keep it grounded and usable at the table: concise, evocative, not a full rules engine.
- "type" MUST be one of the allowed ability types listed below. If unsure, use OTHER.
- "effectDescription" is the narrative effect; "rulesText" is a light mechanical note; "costDescription" is what it costs the character; "limitationDescription" is when it can't be used.
- "masterNotes" is master-only — put GM-facing secrets/hooks there.
- Return isUnique and isVisibleToPlayers as booleans. Default improvised abilities to isVisibleToPlayers=false (they may hide spoilers or private mechanics).

Respond with a STRICT JSON object, no markdown, exactly these keys:
{
  "name": string,
  "type": string,
  "shortDescription": string,
  "description": string,
  "effectDescription": string,
  "rulesText": string,
  "costDescription": string,
  "limitationDescription": string,
  "masterNotes": string,
  "isUnique": boolean,
  "isVisibleToPlayers": boolean
}`;

/**
 * ImprovisedAbilityAgent — turns a master's partial ability (plus the live
 * campaign/scene/character context) into a full, coherent ability proposal via
 * the abstract {@link TextGenerationProvider}. It only PROPOSES; the
 * authoritative "master fields always win" merge and type validation live in the
 * service — never trusting the prompt alone. Mirrors the other improvise agents.
 */
@Injectable()
export class ImprovisedAbilityAgent {
  private readonly logger = new Logger(ImprovisedAbilityAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  /** Whether AI completion is available at all (no key ⇒ manual-only). */
  isConfigured(): boolean {
    return this.llm.isConfigured();
  }

  async complete(
    context: ImproviseAbilityContext,
  ): Promise<ImprovisedAbilityResult> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(context),
      json: true,
      temperature: 0.8,
      maxTokens: 1100,
    });
    return this.parse(text);
  }

  private buildUserPrompt(context: ImproviseAbilityContext): string {
    const {
      campaign,
      map,
      selectedCharacter,
      factions,
      existingAbilities,
      attributes,
      allowedTypes,
      partial,
      instructions,
    } = context;
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

    if (map) {
      lines.push('', '# Current scene / map');
      add('Map', map.name);
      add('Kind', map.type);
      add('Summary', map.shortDescription);
      if (map.pointsOfInterest.length) {
        add('Points of interest', map.pointsOfInterest.join(', '));
      }
      if (map.charactersPresent.length) {
        add('Characters present', map.charactersPresent.join(', '));
      }
    }

    if (selectedCharacter) {
      lines.push('', '# Focused character (design the ability for them)');
      add('Name', selectedCharacter.name);
      add('Summary', selectedCharacter.shortDescription);
      add('Active form', selectedCharacter.activeFormName);
      add('Active form appearance', selectedCharacter.activeFormAppearance);
    }

    if (factions.length) {
      lines.push('', '# Factions');
      factions.forEach((f) => lines.push(`- ${f}`));
    }
    if (existingAbilities.length) {
      lines.push('', '# Existing abilities (avoid duplicating)');
      lines.push(existingAbilities.join(', '));
    }
    if (attributes.length) {
      lines.push('', '# Campaign attributes', attributes.join(', '));
    }

    lines.push('', '# Allowed ability types', allowedTypes.join(', '));

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

  private parse(raw: string): ImprovisedAbilityResult {
    const cleaned = raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Ability improvisation JSON parse failed: ${(error as Error).message}`);
      throw new Error('LLM returned invalid JSON for the improvised ability');
    }

    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
    const bool = (v: unknown): boolean | null =>
      typeof v === 'boolean' ? v : null;

    const name = str(parsed.name);
    if (!name) {
      throw new Error('LLM returned an improvised ability without a name');
    }

    return {
      name,
      type: str(parsed.type),
      shortDescription: str(parsed.shortDescription),
      description: str(parsed.description),
      effectDescription: str(parsed.effectDescription),
      rulesText: str(parsed.rulesText),
      costDescription: str(parsed.costDescription),
      limitationDescription: str(parsed.limitationDescription),
      masterNotes: str(parsed.masterNotes),
      isUnique: bool(parsed.isUnique),
      isVisibleToPlayers: bool(parsed.isVisibleToPlayers),
    };
  }
}
