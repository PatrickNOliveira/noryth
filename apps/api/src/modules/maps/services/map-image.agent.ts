import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';

export interface MapPromptCampaignContext {
  name: string;
  theme: string;
  tone: string;
  mainLanguage: string;
}

export interface MapPromptContext {
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  history: string;
  /** Map-specific art direction (complements the global one). */
  artDirection: string;
}

export interface MapPromptParent {
  name: string;
  type: string;
}

export interface MapPromptOptions {
  /** Campaign-wide global map art direction. */
  globalArtDirection?: string;
  adjustments?: string;
  ignoreArtDirection?: boolean;
  /**
   * When true, the model is ALLOWED to draw readable map labels and the
   * text-blocking negatives are dropped. Default false = a clean, label-free
   * map (reliable labels come from the point-of-interest overlay).
   */
  includeLabels?: boolean;
}

export interface MapImagePrompt {
  imagePrompt: string;
  negativePrompt: string;
}

/** Terms that block on-image text — dropped when the master wants labels. */
const LABEL_BLOCKING_NEGATIVE = [
  'text',
  'letters',
  'words',
  'labels',
  'typography',
  'readable writing',
];

/** Always-applied negatives (never block legitimate label requests). */
const BASE_NEGATIVE = [
  'watermark',
  'signature',
  'UI elements',
  'modern map icons',
  'satellite photo',
  'real-world map',
  'GPS interface',
  'bright cartoon colors',
  'childish style',
  'anime',
  'modern city',
  'sci-fi elements',
  'cluttered composition',
  'low legibility',
  'blurry',
  'low quality',
  'distorted perspective',
  'excessive detail',
  'messy layout',
];

/** Positive-prompt clause telling the model whether to draw labels. */
const LABELS_POLICY = {
  include:
    'Include readable fantasy map labels for the main visible locations, using elegant medieval cartographic typography. Labels should be sparse, clear, integrated into the parchment map, and only applied to important locations.',
  exclude: 'No readable text, no labels, no typography, no watermark.',
} as const;

/**
 * Not every "map" record is a top-down map. Three visual intents exist:
 * a cartographic map (world/region/city), a floor plan (dungeon/tactical
 * top-down), or an atmospheric environment illustration (a castle interior, a
 * hall, ruins…). Forcing "room map / top-down / labels" onto an interior ruins
 * the intent, so we infer which one the master actually wants.
 */
export type MapImageIntent =
  | 'CARTOGRAPHIC_MAP'
  | 'FLOOR_PLAN'
  | 'ENVIRONMENT_ILLUSTRATION';

/** Hints that the master explicitly wants a top-down plan/tactical map. */
const FLOOR_PLAN_HINTS = [
  'top-down',
  'top down',
  'floor plan',
  'floorplan',
  'planta',
  'planta baixa',
  'dungeon map',
  'tactical map',
  'mapa tatico',
  'mapa tático',
  'vista de cima',
  'visto de cima',
  'room layout',
  'layout de salas',
  'blueprint',
  'grid',
];

/** Hints that this is an atmospheric interior/environment, not a map. */
const ENVIRONMENT_HINTS = [
  'interior',
  'inside',
  'dentro',
  'ambiente',
  'atmosfera',
  'atmosphere',
  'salão',
  'salao',
  'salões',
  'saloes',
  'hall',
  'corredor',
  'corridor',
  'escadaria',
  'staircase',
  'capela',
  'chapel',
  'biblioteca',
  'library',
  'catedral',
  'cathedral',
  'throne room',
  'sala do trono',
  'chamber',
  'câmara',
  'camara',
  'ruínas',
  'ruinas',
  'ruins',
  'mostrar o interior',
  'visão ampla',
  'visao ampla',
];

/** Map types that read as an interior/room environment by default. */
const ENVIRONMENT_TYPES = ['INTERIOR', 'ROOM', 'BUILDING'];
/** Map types that read as a top-down plan by default. */
const FLOOR_PLAN_TYPES = ['DUNGEON', 'BATTLEFIELD'];

/**
 * Infers the visual intent from the map type + free text (description/history/
 * art direction/adjustments). Explicit floor-plan wording wins; then explicit
 * environment wording; then the map type; otherwise a cartographic map.
 */
export function inferMapIntent(type: string, text: string): MapImageIntent {
  const t = text.toLowerCase();
  if (FLOOR_PLAN_HINTS.some((h) => t.includes(h))) return 'FLOOR_PLAN';
  if (ENVIRONMENT_HINTS.some((h) => t.includes(h))) return 'ENVIRONMENT_ILLUSTRATION';
  const upper = (type || '').toUpperCase();
  if (FLOOR_PLAN_TYPES.includes(upper)) return 'FLOOR_PLAN';
  if (ENVIRONMENT_TYPES.includes(upper)) return 'ENVIRONMENT_ILLUSTRATION';
  return 'CARTOGRAPHIC_MAP';
}

/** Extra negatives for environment illustrations — keep the map look away. */
const ENVIRONMENT_NEGATIVE = [
  'top-down view',
  'room map',
  'floor plan',
  'tactical map',
  'board game map',
  'cartographic map',
  'parchment map',
  'map borders',
  'map legend',
  'grid',
  'map layout',
];

function buildNegative(includeLabels: boolean, intent: MapImageIntent): string {
  // Environment illustrations never carry labels and must not look like a map.
  const labelsAllowed = includeLabels && intent !== 'ENVIRONMENT_ILLUSTRATION';
  const terms = labelsAllowed
    ? [...BASE_NEGATIVE]
    : [...LABEL_BLOCKING_NEGATIVE, ...BASE_NEGATIVE];
  if (intent === 'ENVIRONMENT_ILLUSTRATION') terms.unshift(...ENVIRONMENT_NEGATIVE);
  return terms.join(', ');
}

const MAP_SYSTEM_PROMPT = `You are an expert fantasy cartographer for a dark-fantasy tabletop RPG.
Turn a map's lore into ONE concise, visual, English prompt for a fantasy MAP image.

Hard rules:
- VISUAL, not literary. Never copy sentences/paragraphs of lore — compress into short visual tokens.
  WRONG: "Below the castle lies the true seat of the house, the Crypt of the Unbroken, where generations..."
  RIGHT: "gothic necromantic castle map, crypt levels beneath the fortress, cypress trees, mausoleums, cold fog, funeral aristocratic atmosphere"
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- It is a MAP (top-down/isometric cartographic view), readable and legible, NOT a scene or a character.
- Layer in THIS priority, rebuilding ONE coherent prompt: 1) map essentials (type/scale, name). 2) key geographic/architectural features. 3) parent map context, if any. 4) campaign theme/tone. 5) global map art direction (unless ignored). 6) the map's specific art direction. 7) the master's adjustments (override conflicts). 8) explicit exceptions.
- A "Labels policy" is provided per request: either INCLUDE readable map labels for important locations, or NO text/labels at all. Follow it exactly and END the prompt with that clause. Never contradict it (do not add "no labels" when labels are requested).

Structure as a single natural sentence in this spirit:
"[Map type] for [name], [fantasy context]. [Perspective/composition]. Important features: [main elements]. Style: [art direction]. Palette: [colors/materials]. Mood: [tone]. [Labels policy clause]."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

const ENVIRONMENT_SYSTEM_PROMPT = `You are a concept artist for a dark-fantasy tabletop RPG.
Turn a location's lore into ONE concise, visual, English prompt for an ATMOSPHERIC ENVIRONMENT ILLUSTRATION of that place — an interior or scene, NOT a map.

Hard rules:
- This is an ILLUSTRATED ENVIRONMENT (a wide, atmospheric view of the place: architecture, materials, lighting, mood and depth). It is NOT a map, NOT a floor plan, NOT a top-down/tactical view, NOT a board game map. Do NOT add map borders, legends, labels, grids or "room map / top-down" wording.
- VISUAL, not literary. Compress lore into short visual tokens; never copy sentences.
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- Focus on: architecture, materials, light sources, atmosphere, notable objects/decor, spatial depth and a wide cinematic/painterly composition. No prominent characters.
- Layer in THIS priority, rebuilding ONE coherent prompt: 1) the place (name + what it is). 2) key architectural/visual features. 3) parent context, if any. 4) campaign theme/tone. 5) global art direction (unless ignored). 6) the map's specific art direction. 7) the master's adjustments (override conflicts).
- End with: "No text, no labels, no map borders, no top-down view."

Structure as a single natural sentence in this spirit:
"[Place name], [what it is]. A wide atmospheric view of [architecture & features]. [Objects/decor & materials]. [Mood/atmosphere]. Palette: [colors]. Lighting: [light]. Style: [art direction]. No text, no labels, no map borders, no top-down view."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

function systemPromptFor(intent: MapImageIntent): string {
  return intent === 'ENVIRONMENT_ILLUSTRATION'
    ? ENVIRONMENT_SYSTEM_PROMPT
    : MAP_SYSTEM_PROMPT;
}

/**
 * MapImageAgent — builds the map image prompt from campaign + map + parent +
 * global/specific art direction + adjustments, via an abstract
 * {@link TextGenerationProvider} with a deterministic fallback. Mirrors the
 * faction/character agents; no infrastructure knowledge.
 */
@Injectable()
export class MapImageAgent {
  private readonly logger = new Logger(MapImageAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    parent?: MapPromptParent,
    options: MapPromptOptions = {},
  ): Promise<MapImagePrompt> {
    const intent = this.resolveIntent(map, options);
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, map, parent, options, intent);
      } catch (error) {
        this.logger.warn(
          `LLM map prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, map, parent, options, intent);
  }

  /** Infers the visual intent from the map's type + all its free text. */
  private resolveIntent(
    map: MapPromptContext,
    options: MapPromptOptions,
  ): MapImageIntent {
    const text = [
      map.shortDescription,
      map.description,
      map.history,
      map.artDirection,
      options.globalArtDirection,
      options.adjustments,
    ]
      .filter(Boolean)
      .join(' ');
    return inferMapIntent(map.type, text);
  }

  private async buildWithLlm(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    parent: MapPromptParent | undefined,
    options: MapPromptOptions,
    intent: MapImageIntent,
  ): Promise<MapImagePrompt> {
    const { text } = await this.llm.generate({
      system: systemPromptFor(intent),
      prompt: this.buildUserPrompt(campaign, map, parent, options, intent),
      json: true,
      temperature: 0.7,
      maxTokens: 650,
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
    return {
      imagePrompt,
      negativePrompt: buildNegative(options.includeLabels ?? false, intent),
    };
  }

  private buildUserPrompt(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    parent: MapPromptParent | undefined,
    options: MapPromptOptions,
    intent: MapImageIntent,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    const isEnvironment = intent === 'ENVIRONMENT_ILLUSTRATION';
    add(
      'Requested visual type',
      isEnvironment
        ? 'ATMOSPHERIC ENVIRONMENT ILLUSTRATION (an interior/scene of the place — NOT a map, NOT a floor plan, NOT top-down)'
        : intent === 'FLOOR_PLAN'
          ? 'TOP-DOWN FLOOR PLAN / tactical map'
          : 'CARTOGRAPHIC FANTASY MAP',
    );
    add(isEnvironment ? 'Place name' : 'Map name', map.name);
    add(isEnvironment ? 'What it is' : 'Map type/scale', map.type);
    add('Short description', map.shortDescription);
    add('Description', map.description);
    add('History / context', map.history);
    if (parent) {
      add('Parent map', parent.name);
      add('Parent map type', parent.type);
    }
    add('Campaign', campaign.name);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    if (options.ignoreArtDirection) {
      add(
        'Global art direction',
        'IGNORE the campaign map art direction for this generation',
      );
    } else {
      add('Global art direction (apply)', options.globalArtDirection);
    }
    add('This map-specific art direction (apply on top)', map.artDirection);
    add(
      'Master adjustments (highest priority, override conflicts)',
      options.adjustments,
    );
    if (isEnvironment) {
      add(
        'Composition',
        'Wide atmospheric illustrated view; no map borders, no labels, no top-down/grid.',
      );
    } else {
      add(
        'Labels policy',
        options.includeLabels ? LABELS_POLICY.include : LABELS_POLICY.exclude,
      );
    }
    add('Input language (translate to English)', campaign.mainLanguage);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    parent: MapPromptParent | undefined,
    options: MapPromptOptions,
    intent: MapImageIntent,
  ): MapImagePrompt {
    return intent === 'ENVIRONMENT_ILLUSTRATION'
      ? this.buildEnvironmentDeterministic(campaign, map, parent, options, intent)
      : this.buildMapDeterministic(campaign, map, parent, options, intent);
  }

  private buildMapDeterministic(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    parent: MapPromptParent | undefined,
    options: MapPromptOptions,
    intent: MapImageIntent,
  ): MapImagePrompt {
    const typeLabel = (map.type || 'location').toLowerCase().replace(/_/g, ' ');
    const parts: string[] = [
      `Dark fantasy top-down fantasy map of ${map.name}, a ${typeLabel} in a ${campaign.theme.replace(/[-_]/g, ' ') || 'dark fantasy'} world.`,
      'Isometric/top-down cartographic view, readable layout, clean fantasy map composition.',
    ];
    const brief = firstSentence(map.shortDescription || map.description);
    if (brief) parts.push(`Important features: ${brief}.`);
    if (parent) parts.push(`Part of ${parent.name}.`);
    parts.push(
      `Style: antique parchment map, gothic medieval cartography, ink linework, subtle grayscale shading, ${campaign.tone.replace(/[-_]/g, ' ') || 'grim'} tone.`,
    );
    const global = (options.globalArtDirection ?? '').trim();
    if (!options.ignoreArtDirection && global) {
      parts.push(`Art direction: ${firstSentence(global) || global}.`);
    }
    const specific = (map.artDirection ?? '').trim();
    if (specific) parts.push(`Specific art direction: ${firstSentence(specific) || specific}.`);
    const adjustments = (options.adjustments ?? '').trim();
    if (adjustments) parts.push(`Requested changes (apply): ${adjustments}.`);
    parts.push(options.includeLabels ? LABELS_POLICY.include : LABELS_POLICY.exclude);
    return {
      imagePrompt: parts.join(' '),
      negativePrompt: buildNegative(options.includeLabels ?? false, intent),
    };
  }

  private buildEnvironmentDeterministic(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    parent: MapPromptParent | undefined,
    options: MapPromptOptions,
    intent: MapImageIntent,
  ): MapImagePrompt {
    const typeLabel = (map.type || 'place').toLowerCase().replace(/_/g, ' ');
    const themeLabel = campaign.theme.replace(/[-_]/g, ' ') || 'dark fantasy';
    const parts: string[] = [
      `${map.name}, a ${typeLabel} in a ${themeLabel} world.`,
      'A wide atmospheric illustrated view of the environment — architecture, materials, lighting and depth. NOT a map, NOT a floor plan, NOT top-down.',
    ];
    const brief = firstSentence(map.shortDescription || map.description);
    if (brief) parts.push(`Important elements: ${brief}.`);
    if (parent) parts.push(`Part of ${parent.name}.`);
    parts.push(
      `Style: cinematic dark fantasy illustration, painterly, dramatic low lighting, deep shadows, muted cold palette, ${campaign.tone.replace(/[-_]/g, ' ') || 'grim'} mood.`,
    );
    const global = (options.globalArtDirection ?? '').trim();
    if (!options.ignoreArtDirection && global) {
      parts.push(`Art direction: ${firstSentence(global) || global}.`);
    }
    const specific = (map.artDirection ?? '').trim();
    if (specific) parts.push(`Specific art direction: ${firstSentence(specific) || specific}.`);
    const adjustments = (options.adjustments ?? '').trim();
    if (adjustments) parts.push(`Requested changes (apply): ${adjustments}.`);
    parts.push('No text, no labels, no map borders, no top-down view.');
    return {
      imagePrompt: parts.join(' '),
      negativePrompt: buildNegative(false, intent),
    };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 180);
}
