/**
 * AITextProvider — PORT for text generation via an LLM.
 *
 * The concrete adapter (OpenAI SDK) will be implemented in a future story and
 * bound to {@link AI_TEXT_PROVIDER}. Domain code depends only on this port.
 */
export interface AITextGenerationOptions {
  /** Sampling temperature (0 = deterministic). */
  temperature?: number;
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
}

export interface AITextProvider {
  /** Generates a completion for the given prompt. */
  generateText(
    prompt: string,
    options?: AITextGenerationOptions,
  ): Promise<string>;
}

/** DI token used to inject an {@link AITextProvider}. */
export const AI_TEXT_PROVIDER = Symbol('AI_TEXT_PROVIDER');
