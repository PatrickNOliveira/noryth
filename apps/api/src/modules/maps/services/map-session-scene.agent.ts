import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TEXT_GENERATION_PROVIDER,
  TextGenerationProvider,
} from '@shared/providers/text-generation/text-generation.provider';
import {
  MapPromptCampaignContext,
  MapPromptContext,
  MapImagePrompt,
} from './map-image.agent';

export interface SessionScenePoint {
  name: string;
  type: string;
}

export interface SessionScenePromptOptions {
  globalArtDirection?: string;
  adjustments?: string;
  points?: SessionScenePoint[];
}

/**
 * Fixed negative prompt for the session scene — steers hard AWAY from a flat
 * paper/parchment map and toward a playable isometric game viewport. Taken from
 * the story brief.
 */
const NEGATIVE_PROMPT = [
  'text',
  'letters',
  'words',
  'labels',
  'UI',
  'interface',
  'menu',
  'watermark',
  'signature',
  'square image',
  'portrait image',
  'vertical composition',
  'black borders',
  'empty borders',
  'letterboxing',
  'pillarboxing',
  'unused margins',
  'cropped main subject',
  'cut off castle',
  'cropped landmarks',
  'close-up',
  'zoomed-in crop',
  'stretched image',
  'distorted image',
  'flat paper map',
  'parchment document',
  'poster',
  'book cover',
  'first-person view',
  'side view',
  'characters',
  'crowds',
  'modern objects',
  'sci-fi',
  'cartoon',
  'anime',
  'bright saturated colors',
  'blurry',
  'low quality',
  'cluttered unreadable scene',
].join(', ');

const SCENE_STYLE_CLAUSE =
  'Wide landscape composition matching a full-screen game viewport, 16:9 horizontal scene, not square, not portrait. The complete playable area is visible within the frame, with important landmarks safely inside the composition. The environment fills the entire image naturally, with terrain, fog, paths and background elements extending to the edges. No black borders, no empty margins, no letterboxing, no pillarboxing. Zoomed-out isometric camera, readable game board layout, designed for placing character tokens later. Clear readable ground areas, atmospheric but usable, dark fantasy realistic painterly style, muted palette. No UI, no text, no labels.';

const SYSTEM_PROMPT = `You are an environment artist for a dark-fantasy tactical RPG.
Turn a map's lore into ONE concise, visual, English prompt for a 2.5D ISOMETRIC GAME VIEWPORT image — a playable tabletop/RPG scene, NOT a paper map.

Hard rules:
- The output is a top-down ISOMETRIC GAME SCENE (a tactical RPG environment viewed from a ZOOMED-OUT isometric camera), NOT a cartographic/parchment map, NOT a landscape photo, NOT a character portrait.
- WIDESCREEN: the image is a WIDE 16:9 horizontal game viewport (like a game screenshot). The playable environment must fill the entire frame edge-to-edge, with NO black borders, NO empty borders, NO letterboxing/pillarboxing, NEVER a vertical/portrait/square/poster/book-cover composition.
- DISPLAYED WITH object-fit COVER: the frame will be cropped slightly to fit different screens. Therefore keep all IMPORTANT landmarks, buildings, paths and points of interest inside SAFE MARGINS, away from the edges, so light cropping never cuts important content. Safe margins do NOT mean empty borders — background terrain, fog, trees and texture must still fill all the way to the edges. Never zoom in close, never fill the frame with one towering structure.
- VISUAL, not literary. Compress lore into short visual tokens; never copy sentences.
- Inputs may be in another language (e.g. Portuguese); the final prompt MUST be in English.
- Build the scene around: the map's name/type as the central environment, its key features/points of interest as placeable landmarks, campaign theme/tone for mood, and the art direction for style.
- The scene must have clear, readable ground so character tokens can be placed later. Atmospheric but usable.
- ALWAYS end with the fixed composition/style clause provided in the request. Never contradict it (do not add "close-up", "cinematic", "dramatic foreground" or "structures at the edge of frame").
- Absolutely no text, labels, UI, or watermark in the described image.

Structure as a single natural sentence in this spirit:
"2.5D isometric game viewport of [name], based on a [theme] [type]. Wide 16:9 landscape composition, widescreen tactical RPG game viewport, horizontal playable map scene, the environment filling the whole frame edge-to-edge. Zoomed-out isometric camera, [central structure] centered, [surrounding landmarks/features] fully visible within safe margins, [mood/atmosphere]. [Composition/style clause]."

Respond with a STRICT JSON object, no markdown, exactly:
{ "imagePrompt": string }`;

/**
 * MapSessionSceneAgent — builds the prompt that turns a map into a 2.5D
 * isometric GAME VIEWPORT (the session scene), via the abstract
 * {@link TextGenerationProvider} with a deterministic fallback. Mirrors
 * {@link MapImageAgent} but targets a playable scene, not a cartographic map.
 * No infrastructure knowledge here.
 */
@Injectable()
export class MapSessionSceneAgent {
  private readonly logger = new Logger(MapSessionSceneAgent.name);

  constructor(
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly llm: TextGenerationProvider,
  ) {}

  async build(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    options: SessionScenePromptOptions = {},
  ): Promise<MapImagePrompt> {
    if (this.llm.isConfigured()) {
      try {
        return await this.buildWithLlm(campaign, map, options);
      } catch (error) {
        this.logger.warn(
          `LLM session-scene prompt failed (${(error as Error).message}); using fallback.`,
        );
      }
    }
    return this.buildDeterministic(campaign, map, options);
  }

  private async buildWithLlm(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    options: SessionScenePromptOptions,
  ): Promise<MapImagePrompt> {
    const { text } = await this.llm.generate({
      system: SYSTEM_PROMPT,
      prompt: this.buildUserPrompt(campaign, map, options),
      json: true,
      temperature: 0.7,
      maxTokens: 650,
    });
    const cleaned = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { imagePrompt?: string };
    let imagePrompt = (parsed.imagePrompt ?? '').trim();
    if (imagePrompt.length < 40) {
      throw new Error('LLM returned an empty or too-short imagePrompt');
    }
    // Guarantee the key clauses are present even if the model dropped them.
    if (!/isometric/i.test(imagePrompt)) {
      imagePrompt = `2.5D isometric game viewport. ${imagePrompt}`;
    }
    // Widescreen + composition/usability clause: if any is missing, append it.
    if (!/16:9|widescreen|no ui/i.test(imagePrompt)) {
      imagePrompt = `${imagePrompt} ${SCENE_STYLE_CLAUSE}`;
    }
    return { imagePrompt, negativePrompt: NEGATIVE_PROMPT };
  }

  private buildUserPrompt(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    options: SessionScenePromptOptions,
  ): string {
    const lines: string[] = [];
    const add = (label: string, value?: string) => {
      const v = (value ?? '').trim();
      if (v) lines.push(`${label}: ${v}`);
    };
    add('Map name', map.name);
    add('Map type/scale', map.type);
    add('Short description', map.shortDescription);
    add('Description', map.description);
    add('History / context', map.history);
    const poi = (options.points ?? [])
      .map((p) => (p.type ? `${p.name} (${p.type})` : p.name))
      .filter(Boolean)
      .slice(0, 12)
      .join('; ');
    add('Points of interest (turn into placeable landmarks)', poi);
    add('Campaign', campaign.name);
    add('Campaign theme', campaign.theme.replace(/[-_]/g, ' '));
    add('Campaign tone', campaign.tone.replace(/[-_]/g, ' '));
    add('Global map art direction (apply)', options.globalArtDirection);
    add('This map-specific art direction (apply on top)', map.artDirection);
    add('Master adjustments (highest priority)', options.adjustments);
    add('Input language (translate to English)', campaign.mainLanguage);
    add('Fixed style clause (end the prompt with this)', SCENE_STYLE_CLAUSE);
    lines.push('', 'Return the JSON object as instructed.');
    return lines.join('\n');
  }

  private buildDeterministic(
    campaign: MapPromptCampaignContext,
    map: MapPromptContext,
    options: SessionScenePromptOptions,
  ): MapImagePrompt {
    const typeLabel = (map.type || 'location').toLowerCase().replace(/_/g, ' ');
    const themeLabel = campaign.theme.replace(/[-_]/g, ' ') || 'dark fantasy';
    const parts: string[] = [
      `2.5D isometric game viewport of ${map.name}, based on a ${themeLabel} ${typeLabel}.`,
      'Wide 16:9 landscape composition, widescreen tactical RPG game viewport, horizontal playable map scene. The environment fills the entire frame edge-to-edge with no black borders and no letterboxing, displayed full-screen with object-fit cover, viewed from a zoomed-out isometric camera, the main structure centered and important landmarks kept inside safe margins away from the edges (background terrain and fog extend beyond the frame), open readable ground where tokens could be placed.',
    ];
    const brief = firstSentence(map.shortDescription || map.description);
    if (brief) parts.push(`Key features: ${brief}.`);
    const landmarks = (options.points ?? [])
      .map((p) => p.name)
      .filter(Boolean)
      .slice(0, 8)
      .join(', ');
    if (landmarks) parts.push(`Surrounding landmarks: ${landmarks}.`);
    parts.push(
      `Mood: ${campaign.tone.replace(/[-_]/g, ' ') || 'grim'}, atmospheric fog, cold light.`,
    );
    const global = (options.globalArtDirection ?? '').trim();
    if (global) parts.push(`Art direction: ${firstSentence(global) || global}.`);
    const specific = (map.artDirection ?? '').trim();
    if (specific) parts.push(`Specific art direction: ${firstSentence(specific) || specific}.`);
    const adjustments = (options.adjustments ?? '').trim();
    if (adjustments) parts.push(`Requested changes (apply): ${adjustments}.`);
    parts.push(SCENE_STYLE_CLAUSE);
    return {
      imagePrompt: parts.join(' '),
      negativePrompt: NEGATIVE_PROMPT,
    };
  }
}

function firstSentence(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.split(/[.\n]/)[0].trim().slice(0, 180);
}
