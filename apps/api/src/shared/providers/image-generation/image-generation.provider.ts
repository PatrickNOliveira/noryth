/**
 * ImageGenerationProvider — PORT for AI image generation.
 *
 * The concrete adapter (OpenAI / diffusion model) will be implemented in a
 * future story and bound to {@link IMAGE_GENERATION_PROVIDER}.
 */
export interface ImageGenerationRequest {
  prompt: string;
  /** e.g. "1024x1024". */
  size?: string;
}

export interface GeneratedImage {
  /** URL or storage key where the image can be retrieved. */
  url: string;
}

export interface ImageGenerationProvider {
  generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
}

/** DI token used to inject an {@link ImageGenerationProvider}. */
export const IMAGE_GENERATION_PROVIDER = Symbol('IMAGE_GENERATION_PROVIDER');
