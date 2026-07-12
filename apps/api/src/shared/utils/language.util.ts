/**
 * Language helpers for AI text generation. The goal: content the model completes
 * must be written in the language the USER expects — the UI locale the frontend
 * sends, or, failing that, the language of what the user already typed, or the
 * campaign's language. Portuguese is NEVER a hardcoded default.
 */

/** Maps a locale (or bare language) code to the English name used in prompts. */
const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'en-us': 'English',
  'en-gb': 'English',
  'pt': 'Portuguese',
  'pt-br': 'Brazilian Portuguese',
  'pt-pt': 'European Portuguese',
  'es': 'Spanish',
  'es-es': 'Spanish',
  'fr': 'French',
  'fr-fr': 'French',
  'it': 'Italian',
  'it-it': 'Italian',
  'nl': 'Dutch',
  'nl-nl': 'Dutch',
};

/** Human name for a locale code (e.g. "pt-BR" → "Brazilian Portuguese"), or null. */
export function describeLanguage(locale?: string | null): string | null {
  if (!locale) return null;
  const norm = locale.trim().toLowerCase();
  if (LANGUAGE_NAMES[norm]) return LANGUAGE_NAMES[norm];
  const base = norm.split(/[-_]/)[0];
  return LANGUAGE_NAMES[base] ?? null;
}

/**
 * Cheap, dependency-free language guess for the fallback path (used only when the
 * frontend doesn't send a target language). Scores a handful of common stopwords
 * per language plus Portuguese/Spanish/French diacritics. Returns the English
 * language name, or null when it can't tell.
 */
export function detectLanguageName(text: string): string | null {
  const t = ` ${(text ?? '').toLowerCase()} `;
  if (t.trim().length < 3) return null;

  const scores: Record<string, number> = {
    English: 0,
    Portuguese: 0,
    Spanish: 0,
    French: 0,
    Italian: 0,
    Dutch: 0,
  };
  const count = (words: string[]): number =>
    words.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);

  scores.English += count([
    'the', 'and', 'with', 'from', 'that', 'this', 'should', 'inside', 'found',
    'of', 'a', 'an', 'is', 'was', 'his', 'her',
  ]);
  scores.Portuguese += count([
    'de', 'que', 'não', 'uma', 'para', 'com', 'dentro', 'dele', 'dela', 'os',
    'as', 'um', 'está', 'ele', 'ela', 'castelo',
  ]);
  scores.Spanish += count([
    'el', 'la', 'los', 'las', 'que', 'una', 'para', 'con', 'dentro', 'dentro',
    'está', 'castillo',
  ]);
  scores.French += count([
    'le', 'les', 'des', 'une', 'avec', 'dans', 'que', 'qui', 'château', 'est',
  ]);
  scores.Italian += count([
    'il', 'lo', 'gli', 'una', 'con', 'dentro', 'che', 'castello', 'è',
  ]);
  scores.Dutch += count(['de', 'het', 'een', 'met', 'binnen', 'dat', 'kasteel']);

  // Diacritic nudges (weak signals, but useful to break ties).
  if (/[ãõ]/.test(t) || /ção|lh[aeiou]/.test(t)) scores.Portuguese += 2;
  if (/[ñ]/.test(t) || /ción/.test(t)) scores.Spanish += 2;
  if (/[àâçèêë]/.test(t) || /eaux?\b/.test(t)) scores.French += 1;

  let best: string | null = null;
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  // Require a minimal signal to avoid guessing on noise.
  return bestScore >= 2 ? best : null;
}

/**
 * The explicit language directive dropped into every "complete with AI" prompt.
 * Reinforces: write completions in `languageName`, never default to Portuguese,
 * and never touch user-provided fields.
 */
export function buildLanguageRequirement(languageName: string): string {
  return [
    'Language requirement:',
    `You must generate all completed text fields in ${languageName}.`,
    'Preserve any user-provided fields exactly as written.',
    'Only complete missing fields.',
    `All generated field values must be written in ${languageName}.`,
    `Do not generate Portuguese text unless the target language is ${languageName} and ${languageName} is Portuguese.`,
    'The campaign context/lore may be in another language, but your output MUST use the target language.',
  ].join('\n');
}

/**
 * Resolves the language the model must WRITE its completions in, in priority
 * order: explicit target (UI locale from the frontend) → detected from the user's
 * own text → campaign language → English. Returns the English language name to
 * drop straight into the prompt.
 */
export function resolveGenerationLanguage(
  explicitTarget: string | undefined | null,
  userText: string,
  campaignLanguage: string | undefined | null,
): string {
  return (
    describeLanguage(explicitTarget) ??
    detectLanguageName(userText) ??
    describeLanguage(campaignLanguage) ??
    'English'
  );
}
