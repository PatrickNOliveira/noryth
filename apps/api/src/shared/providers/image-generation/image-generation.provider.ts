/**
 * ImageGenerationProvider — PORT for AI image generation.
 *
 * Domain modules (e.g. Factions) depend ONLY on this interface and the
 * {@link IMAGE_GENERATION_PROVIDER} token — never on OpenAI. The provider
 * returns raw bytes so the caller can persist them through the StorageProvider.
 */
export interface ImageGenerationRequest {
  prompt: string;
  /** Things to avoid; folded into the prompt for providers without a native field. */
  negativePrompt?: string;
  /** e.g. "1024x1024". */
  size?: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  contentType: string;
}

export interface ImageGenerationProvider {
  /** Whether the provider is configured (API key present, etc.). */
  isConfigured(): boolean;
  generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
}

/** DI token used to inject an {@link ImageGenerationProvider}. */
export const IMAGE_GENERATION_PROVIDER = Symbol('IMAGE_GENERATION_PROVIDER');
