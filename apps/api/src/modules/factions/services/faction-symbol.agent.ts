import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import { FactionSymbolType } from '../faction.constants';

/** Campaign context the agent weaves into the prompt. */
export interface CampaignContext {
  name: string;
  theme: string;
  description: string;
  premise: string;
  tone: string;
  mainLanguage: string;
}

/** Faction context the agent weaves into the prompt. */
export interface FactionContext {
  name: string;
  type: string;
  description: string;
  history: string;
  identity: string;
  memberTraits: string;
  values: string;
  motto: string;
  colors: string;
  recurringElements: string;
  symbolType: FactionSymbolType;
  symbolPrompt: string;
}

export interface FactionSymbolPrompt {
  imagePrompt: string;
  negativePrompt: string;
  styleNotes: string;
  summary: string;
}

/**
 * Standardized negative prompt for every faction symbol. Kept strong and fixed
 * (per product spec) so no generation drifts into text, modern logos, cluttered
 * scenes or inconsistent styles. The LLM only shapes the POSITIVE prompt.
 */
const STANDARD_NEGATIVE_PROMPT = [
  'text',
  'letters',
  'words',
  'typography',
  'readable writing',
  'watermark',
  'signature',
  'logo mockup',
  'modern corporate logo',
  'UI elements',
  'photorealistic portrait',
  'human face',
  'full character',
  'crowded scene',
  'landscape',
  'castle scene',
  'cinematic background',
  'too many objects',
  'excessive detail',
  'messy composition',
  'low contrast',
  'low legibility',
  'blurry',
  'low quality',
  'childish cartoon',
  'bright saturated colors',
  'neon colors',
  'inconsistent style',
  '3d render',
  'realistic photo',
].join(', ');

/**
 * System instruction that turns the FactionSymbolAgent into an art director:
 * it must INTERPRET the lore into visual decisions, not echo it back.
 */
const SYSTEM_PROMPT = `You are an expert heraldic art director for a dark-fantasy tabletop RPG.
Your job: turn a faction's lore into ONE concise, visual, English image prompt for a coat of arms / banner / seal / faction emblem.

Hard rules:
- The final prompt must be VISUAL, not literary. NEVER copy sentences or paragraphs of lore. Compress lore into short visual tokens.
  WRONG: "Below the castle lies the true seat of the house, the Crypt of the Unbroken, where generations..."
  RIGHT: "ancestral necromantic noble house, funeral elegance, cryptic lineage, cold aristocratic symbolism"
- Inputs may be written in another language (e.g. Portuguese). The final prompt MUST be written in English.
- Choose exactly ONE dominant central symbol. Add at most 3 supporting elements. Never crowd the emblem.
- Translate vague style words into useful visual terms. Example: "realista, tipo tatuagem, acinzentado, sem cores" -> "grayscale tattoo-style realism, engraved ink illustration, high contrast, ornamental linework, no vibrant colors".
- Keep it an EMBLEM/SEAL/BANNER, never a cinematic scene or book cover. Strong readable silhouette, single centered emblem, clean plain background, legible at small size.
- No text, no letters, no house name, no motto rendered in the image.
- Respect the requested shape: if the user asks for a circular/round format use "circular noble seal / round heraldic medallion" (do NOT force a shield); if they ask for a shield use "shield-shaped escutcheon"; otherwise use a sensible heraldic default for the symbol type.
- If the lore is sparse, ENRICH it using the faction archetype, tone and values so the emblem still feels rich and intentional.
- When the user asks for "no colors" / grayscale, use a monochrome palette (black, ash gray, bone white, cold silver highlights only).

Structure the positive prompt like this (single string, natural sentences, in this order):
[Image type] for "[Faction name]", [faction archetype]. [Composition/format]. Central symbol: [main symbol]. Supporting elements: [<=3 secondary symbols]. Style: [art style]. Palette: [colors]. Mood: [campaign tone]. No text, no letters, no words, no typography, no watermark, no signature.

Respond with a STRICT JSON object, no markdown, with exactly these keys:
{
  "imagePrompt": string,  // the final positive prompt, following the structure above
  "styleNotes": string,   // one short line naming the chosen art style + palette
  "summary": string       // one short line naming the emblem and its central symbol
}`;

/**
 * FactionSymbolAgent — application-level agent that assembles the final image
 * prompt for a faction's coat of arms / banner from the WHOLE campaign + faction
 * context. It INTERPRETS the lore into visual decisions (central symbol,
 * composition, palette, style) via an abstract {@link TextGenerationProvider},
 * so the reasoning model can be swapped freely and domain code never touches an
 * SDK. Falls back to a deterministic builder when the provider is unavailable,
 * so faction creation always works — even offline.
 */
@Injectable()
export class FactionSymbolAgent {
  private readonly logger = new Logger(FactionSymbolAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: CampaignContext,
    faction: FactionContext,
    adjustments?: string,
  ): Promise<FactionSymbolPrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, faction, adjustments);
      } catch (error) {
        this.logger.warn(
          `LLM prompt build failed (${(error as Error).message}); using deterministic fallback.`,
        );
      }
    } else {
      this.logger.log('Text provider not configured; using deterministic prompt fallback.');
    }
    return this.buildDeterministic(campaign, faction, adjustments);
  }

  // ── LLM path ────────────────────────────────────────────────

  private async buildWithLlm(
    campaign: CampaignContext,
    faction: FactionContext,
    adjustments?: string,
  ): Promise<FactionSymbolPrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, faction, adjustments),
      json: true,
      temperature: 0.7,
      maxTokens: 700,
    });

    const parsed = this.parseLlmJson(text);
    const imagePrompt = (parsed.imagePrompt ?? '').trim();
    if (imagePrompt.length < 40) {
      throw new Error('LLM returned an empty or too-short imagePrompt');
    }

    return {
      imagePrompt,
      // Negative prompt is standardized in code, never delegated to the model.
      negativePrompt: STANDARD_NEGATIVE_PROMPT,
      styleNotes: (parsed.styleNotes ?? '').trim(),
      summary: (parsed.summary ?? '').trim() || `Emblem for ${faction.name}.`,
    };
  }

  /** Lists only the non-empty context fields so the model gets signal, not noise. */
  private buildUserPrompt(
    campaign: CampaignContext,
    faction: FactionContext,
    adjustments?: string,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };

    add('Symbol type', faction.symbolType === 'banner' ? 'war banner' : 'coat of arms');
    add('Faction name', faction.name);
    add('Faction type', faction.type.replace(/_/g, ' '));
    add('Core symbol idea', faction.symbolPrompt);
    add('Recurring visual elements', faction.recurringElements);
    add('Preferred colors', faction.colors);
    add('Identity', faction.identity);
    add('Description', faction.description);
    add('Values', faction.values);
    add('Motto (do NOT render as text)', faction.motto);
    add('Member traits', faction.memberTraits);
    add('History / lore', faction.history);
    add('Campaign', campaign.name);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    add('Campaign premise', campaign.premise);
    add('Input language (translate to English)', campaign.mainLanguage);
    add('User adjustments (highest priority)', adjustments);

    lines.push(
      '',
      'Interpret the lore into visual decisions and return the JSON object as instructed.',
    );
    return lines.join('\n');
  }

  private parseLlmJson(text: string): Partial<FactionSymbolPrompt> {
    // Strip accidental code fences before parsing.
    const cleaned = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned) as Partial<FactionSymbolPrompt>;
  }

  // ── Deterministic fallback ──────────────────────────────────

  /**
   * Heuristic builder used when no text provider is configured. Still follows
   * the visual structure (type → composition → main/secondary symbols → style →
   * palette → mood), but cannot translate free text — it leans on the structured
   * fields and archetype defaults.
   */
  private buildDeterministic(
    campaign: CampaignContext,
    faction: FactionContext,
    adjustments?: string,
  ): FactionSymbolPrompt {
    const hints = [
      faction.symbolPrompt,
      faction.recurringElements,
      faction.colors,
      campaign.tone,
      adjustments ?? '',
    ]
      .join(' ')
      .toLowerCase();

    const isBanner = faction.symbolType === 'banner';
    const arche = archetypeFor(faction.type);
    const genre = genreDescriptor(campaign.tone, campaign.theme);
    const grayscale = /sem cor|grayscale|greyscale|monochrome|preto e branco|black and white|no colou?r|acinzentad/.test(
      hints,
    );

    const { imageType, composition } = resolveFormat(hints, isBanner, genre);

    const recurring = splitElements(faction.recurringElements);
    const mainSymbol =
      firstClause(faction.symbolPrompt) || recurring[0] || arche.symbol;
    const supporting = recurring
      .filter((s) => s !== mainSymbol)
      .concat(arche.supporting)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3);

    const palette = grayscale
      ? 'monochrome black, ash gray, bone white, cold silver highlights only'
      : firstNonEmpty(faction.colors, arche.palette);

    const style = [
      'flat heraldic emblem design',
      'engraved ink illustration',
      'ornamental linework',
      'high contrast',
      ...detectStyle(hints),
      ...(grayscale ? ['grayscale shading', 'no vibrant colors'] : []),
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    const mood = [genre, ...arche.mood]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 4)
      .join(', ');

    const parts = [
      `${imageType} for "${faction.name}", ${arche.archetype}.`,
      `${composition}.`,
      `Central symbol: ${mainSymbol}.`,
      supporting.length ? `Supporting elements: ${supporting.join(', ')}.` : '',
      `Style: ${style}.`,
      `Palette: ${palette}.`,
      `Mood: ${mood}.`,
      adjustments ? `Requested adjustments: ${adjustments}.` : '',
      'Single centered emblem, clean plain background, strong readable silhouette, symbol not a scene.',
      'No text, no letters, no words, no typography, no watermark, no signature.',
    ].filter(Boolean);

    return {
      imagePrompt: parts.join(' '),
      negativePrompt: STANDARD_NEGATIVE_PROMPT,
      styleNotes: `${style}. Palette: ${palette}.`,
      summary: `${isBanner ? 'Banner' : 'Coat of arms'} for ${faction.name}: ${mainSymbol}.`,
    };
  }
}

// ── Deterministic helpers ─────────────────────────────────────

interface Archetype {
  archetype: string;
  symbol: string;
  supporting: string[];
  palette: string;
  mood: string[];
}

const TYPE_ARCHETYPES: Record<string, Archetype> = {
  kingdom: {
    archetype: 'a royal kingdom',
    symbol: 'a crowned lion',
    supporting: ['crossed scepters', 'laurel wreath'],
    palette: 'royal gold, deep crimson, ivory',
    mood: ['regal authority', 'ancient sovereignty'],
  },
  empire: {
    archetype: 'a vast empire',
    symbol: 'a double-headed eagle',
    supporting: ['imperial crown', 'radiant sun'],
    palette: 'imperial purple, antique gold, black iron',
    mood: ['imperial grandeur', 'martial dominion'],
  },
  noble_house: {
    archetype: 'an old noble house',
    symbol: 'a heraldic beast on an escutcheon',
    supporting: ['ancestral crown', 'laurel branches'],
    palette: 'antique gold, deep wine red, bone white',
    mood: ['aristocratic pride', 'ancestral lineage'],
  },
  clan: {
    archetype: 'a highland clan',
    symbol: 'a knotwork beast',
    supporting: ['crossed axes', 'mountain crest'],
    palette: 'iron gray, moss green, weathered bronze',
    mood: ['fierce kinship', 'old blood loyalty'],
  },
  guild: {
    archetype: 'a craftsmen guild',
    symbol: 'a central tool crest',
    supporting: ['gear ring', 'balanced scales'],
    palette: 'brass, deep teal, parchment white',
    mood: ['disciplined craft', 'proud tradition'],
  },
  religious_order: {
    archetype: 'a religious order',
    symbol: 'a radiant sacred sigil',
    supporting: ['halo ring', 'candles'],
    palette: 'antique gold, ivory, deep indigo',
    mood: ['sacred solemnity', 'devout zeal'],
  },
  military_order: {
    archetype: 'a martial military order',
    symbol: 'a sword over a shield',
    supporting: ['laurel wreath', 'iron rivets'],
    palette: 'steel gray, blood red, black iron',
    mood: ['martial discipline', 'sworn duty'],
  },
  mercenary_company: {
    archetype: 'a mercenary company',
    symbol: 'a coin behind crossed blades',
    supporting: ['broken chain', 'raven'],
    palette: 'gunmetal gray, blood red, tarnished gold',
    mood: ['ruthless pragmatism', 'blood for coin'],
  },
  tribe: {
    archetype: 'a wild tribe',
    symbol: 'a totem beast skull',
    supporting: ['bone charms', 'feathers'],
    palette: 'ochre, bone white, charcoal black',
    mood: ['primal spirit', 'ancestral wilderness'],
  },
  cult: {
    archetype: 'a secret cult',
    symbol: 'an unblinking eye within a broken circle',
    supporting: ['ritual candles', 'serpent coil'],
    palette: 'void black, sickly green, bone white',
    mood: ['occult dread', 'hidden devotion'],
  },
  criminal_organization: {
    archetype: 'a criminal syndicate',
    symbol: 'a dagger through a coin',
    supporting: ['spider', 'broken chain'],
    palette: 'shadow black, blood red, tarnished silver',
    mood: ['shadowed menace', 'underworld power'],
  },
  corporation: {
    archetype: 'a powerful trade house',
    symbol: 'a central geometric monogram crest',
    supporting: ['balanced scales', 'gear ring'],
    palette: 'deep navy, brushed silver, cold white',
    mood: ['cold ambition', 'calculated power'],
  },
  custom: {
    archetype: 'a faction of the realm',
    symbol: 'a bold central heraldic emblem',
    supporting: ['laurel branches', 'geometric border'],
    palette: 'iron gray, antique gold, bone white',
    mood: ['dark fantasy gravitas', 'grim resolve'],
  },
};

const STYLE_CUES: { match: RegExp; tokens: string[] }[] = [
  { match: /tatto|tatua/, tokens: ['tattoo-style realism', 'engraved ink illustration'] },
  { match: /gravur|engrav|etch/, tokens: ['engraved illustration', 'fine etched linework'] },
  { match: /goth|góti|goti/, tokens: ['gothic medieval ornament'] },
  { match: /minimal/, tokens: ['minimalist flat design'] },
  { match: /realis/, tokens: ['detailed realistic rendering'] },
  { match: /ornament|barroc|baroque/, tokens: ['ornate baroque detailing'] },
  { match: /rune|rúnic|runic/, tokens: ['runic engraved motifs'] },
];

function archetypeFor(type: string): Archetype {
  return TYPE_ARCHETYPES[type] ?? TYPE_ARCHETYPES.custom;
}

function genreDescriptor(tone: string, theme: string): string {
  const t = `${tone} ${theme}`.toLowerCase();
  if (/necro|undead|morte|mort/.test(t)) return 'necromantic dark fantasy';
  if (/goth|góti|goti/.test(t)) return 'gothic medieval';
  if (/horror|terror/.test(t)) return 'grim horror';
  if (/grim|dark|sombri|obscur/.test(t)) return 'dark fantasy';
  if (/noble|court|corte/.test(t)) return 'grim noble';
  return 'dark fantasy';
}

function resolveFormat(
  hints: string,
  isBanner: boolean,
  genre: string,
): { imageType: string; composition: string } {
  const lead = capitalize(genre);
  if (isBanner) {
    return {
      imageType: `${lead} war banner emblem`,
      composition:
        'Vertical hanging war banner with cloth folds and tasseled edges, centered insignia, symmetrical composition, clean plain background, strong readable silhouette',
    };
  }
  if (/circ|round|seal|medal|medall|redond/.test(hints)) {
    return {
      imageType: `${lead} heraldic emblem`,
      composition:
        'Circular noble seal, round heraldic medallion, symmetrical composition, single centered emblem, clean plain background, strong readable silhouette',
    };
  }
  if (/shield|escud|escutch/.test(hints)) {
    return {
      imageType: `${lead} heraldic coat of arms`,
      composition:
        'Shield-shaped escutcheon, symmetrical composition, single centered emblem, clean plain background, strong readable silhouette',
    };
  }
  return {
    imageType: `${lead} heraldic coat of arms`,
    composition:
      'Medieval escutcheon, symmetrical composition, single centered emblem, clean plain background, strong readable silhouette',
  };
}

function detectStyle(hints: string): string[] {
  const tokens: string[] = [];
  for (const cue of STYLE_CUES) {
    if (cue.match.test(hints)) tokens.push(...cue.tokens);
  }
  return tokens;
}

function splitElements(value: string): string[] {
  return (value ?? '')
    .split(/[,;\n/·•]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function firstClause(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 140);
}

function firstNonEmpty(...values: string[]): string {
  return values.find((v) => (v ?? '').trim().length > 0)?.trim() ?? '';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
