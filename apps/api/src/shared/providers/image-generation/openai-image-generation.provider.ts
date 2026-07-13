import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@shared/config/env.validation';
import {
  GeneratedImage,
  ImageEditRequest,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from './image-generation.provider';

/**
 * OpenAI adapter for {@link ImageGenerationProvider}. The ONLY file that talks
 * to OpenAI — domain code stays unaware of it.
 *
 * Uses the Images API over `fetch` (no SDK dependency). OpenAI has no separate
 * negative-prompt field, so the negative prompt is folded into the text.
 */
@Injectable()
export class OpenAIImageGenerationProvider implements ImageGenerationProvider {
  private readonly logger = new Logger(OpenAIImageGenerationProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly size: string;
  private readonly endpoint = 'https://api.openai.com/v1/images/generations';
  /**
   * Hard timeout per HTTP call. Without it, a hung request would keep the queue
   * worker (and the image status) stuck forever with no error — so a timeout is
   * what turns "silently stuck" into a normal failure the pipeline can recover.
   */
  private readonly requestTimeoutMs = 120_000;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.apiKey = config.get('OPENAI_API_KEY', { infer: true });
    this.model = config.get('OPENAI_IMAGE_MODEL', { infer: true });
    this.size = config.get('OPENAI_IMAGE_SIZE', { infer: true });
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Best valid landscape size for the configured model. gpt-image-1 accepts
   * 1536x1024; dall-e-3 accepts 1792x1024. For anything else we fall back to the
   * configured default (may be square) rather than send a size the API rejects.
   */
  landscapeSize(): string {
    if (this.model.includes('dall-e-3')) return '1792x1024';
    if (this.model.includes('gpt-image')) return '1536x1024';
    return this.size;
  }

  /**
   * Best valid portrait/vertical size for the configured model. gpt-image-1
   * accepts 1024x1536; dall-e-3 accepts 1024x1792. The extra vertical room lets a
   * full-body standing sprite fit head-to-feet with headroom instead of clipping
   * the head on a square canvas. Falls back to the configured default otherwise.
   */
  portraitSize(): string {
    if (this.model.includes('dall-e-3')) return '1024x1792';
    if (this.model.includes('gpt-image')) return '1024x1536';
    return this.size;
  }

  /**
   * This adapter uses the text-to-image endpoint only. Image-to-image is not
   * enabled, so callers rebuild a coherent prompt and regenerate instead. A
   * future provider can flip this on without any domain change.
   */
  supportsImageToImage(): boolean {
    return false;
  }

  editImage(_request: ImageEditRequest): Promise<GeneratedImage> {
    // Never called while supportsImageToImage() is false.
    throw new ServiceUnavailableException(
      'Edição de imagem (image-to-image) não é suportada por este provider.',
    );
  }

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Geração de imagem por IA não está configurada (OPENAI_API_KEY ausente).',
      );
    }

    const size = request.size ?? this.size;
    const prompt = request.negativePrompt
      ? `${request.prompt}\n\nDo NOT include: ${request.negativePrompt}`
      : request.prompt;

    this.logger.log(
      `→ OpenAI images: model=${this.model} size=${size} promptChars=${prompt.length}`,
    );
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await this.fetchWithTimeout(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          size,
          n: 1,
        }),
      });
    } catch (error) {
      this.logger.error(
        `OpenAI request failed after ${Date.now() - startedAt}ms: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException('Falha ao contatar o serviço de IA.');
    }

    const elapsed = Date.now() - startedAt;
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `OpenAI error ${response.status} in ${elapsed}ms: ${body.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException('O serviço de IA recusou a requisição.');
    }
    this.logger.log(`← OpenAI responded ${response.status} in ${elapsed}ms`);

    const json = (await response.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const item = json.data?.[0];

    if (item?.b64_json) {
      const buffer = Buffer.from(item.b64_json, 'base64');
      this.logger.log(`Image decoded from base64: ${buffer.length} bytes`);
      return { buffer, contentType: 'image/png' };
    }
    if (item?.url) {
      this.logger.log(`Fetching image from returned URL…`);
      const img = await this.fetchWithTimeout(item.url, {});
      const arrayBuffer = await img.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      this.logger.log(`Image downloaded from URL: ${buffer.length} bytes`);
      return {
        buffer,
        contentType: img.headers.get('content-type') ?? 'image/png',
      };
    }

    this.logger.error('OpenAI returned no image data');
    throw new ServiceUnavailableException('O serviço de IA não retornou imagem.');
  }

  /** `fetch` that aborts (and throws) after {@link requestTimeoutMs}. */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
