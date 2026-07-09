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

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.apiKey = config.get('OPENAI_API_KEY', { infer: true });
    this.model = config.get('OPENAI_IMAGE_MODEL', { infer: true });
    this.size = config.get('OPENAI_IMAGE_SIZE', { infer: true });
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
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
      response = await fetch(this.endpoint, {
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
      const img = await fetch(item.url);
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
}
