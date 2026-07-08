/**
 * TextGenerationProvider — PORT for AI text/LLM completion.
 *
 * Domain modules (e.g. the FactionSymbolAgent) depend ONLY on this interface
 * and the {@link TEXT_GENERATION_PROVIDER} token — never on OpenAI or any SDK.
 * The concrete model (OpenAI today, anything tomorrow) is an infra detail.
 */
export interface TextGenerationRequest {
  /** Instruction / role context for the model. */
  system?: string;
  /** The user message. */
  prompt: string;
  /** Ask the model to return a strict JSON object (best-effort per provider). */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface TextGenerationResult {
  /** Raw text returned by the model (JSON string when `json` was requested). */
  text: string;
}

export interface TextGenerationProvider {
  /** Whether the provider is configured (API key present, etc.). */
  isConfigured(): boolean;
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

/** DI token used to inject a {@link TextGenerationProvider}. */
export const TEXT_GENERATION_PROVIDER = Symbol('TEXT_GENERATION_PROVIDER');
