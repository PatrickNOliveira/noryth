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

/**
 * Image-to-image edit request: a base image (by URL, so the provider fetches it)
 * plus a prompt describing the desired changes.
 */
export interface ImageEditRequest {
  prompt: string;
  negativePrompt?: string;
  baseImageUrl: string;
  size?: string;
}

export interface ImageGenerationProvider {
  /** Whether the provider is configured (API key present, etc.). */
  isConfigured(): boolean;
  /**
   * A valid WIDESCREEN/landscape size string for this provider's model (e.g.
   * "1536x1024"). Callers that need a horizontal image (like the session scene)
   * pass this as {@link ImageGenerationRequest.size} — the model-specific pixel
   * math stays inside the adapter, never in domain code.
   */
  landscapeSize(): string;
  generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
  /**
   * Whether this provider can edit from a base image (image-to-image). When
   * false, callers fall back to {@link generateImage} with a rebuilt prompt —
   * so this limitation stays isolated in the provider, never in domain code.
   */
  supportsImageToImage(): boolean;
  /** Only valid when {@link supportsImageToImage} returns true. */
  editImage(request: ImageEditRequest): Promise<GeneratedImage>;
}

/** DI token used to inject an {@link ImageGenerationProvider}. */
export const IMAGE_GENERATION_PROVIDER = Symbol('IMAGE_GENERATION_PROVIDER');
