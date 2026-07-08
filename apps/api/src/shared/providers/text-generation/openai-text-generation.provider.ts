import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@shared/config/env.validation';
import {
  TextGenerationProvider,
  TextGenerationRequest,
  TextGenerationResult,
} from './text-generation.provider';

/**
 * OpenAI adapter for {@link TextGenerationProvider}. The ONLY text-generation
 * file that talks to OpenAI — domain code stays unaware of it.
 *
 * Uses the Chat Completions API over `fetch` (no SDK dependency), mirroring the
 * image adapter. Reuses OPENAI_API_KEY; the model is configured separately.
 */
@Injectable()
export class OpenAITextGenerationProvider implements TextGenerationProvider {
  private readonly logger = new Logger(OpenAITextGenerationProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.apiKey = config.get('OPENAI_API_KEY', { infer: true });
    this.model = config.get('OPENAI_TEXT_MODEL', { infer: true });
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Geração de texto por IA não está configurada (OPENAI_API_KEY ausente).',
      );
    }

    const messages = [
      ...(request.system
        ? [{ role: 'system' as const, content: request.system }]
        : []),
      { role: 'user' as const, content: request.prompt },
    ];

    this.logger.log(
      `→ OpenAI chat: model=${this.model} json=${request.json ?? false} promptChars=${request.prompt.length}`,
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
          messages,
          temperature: request.temperature ?? 0.7,
          ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
          ...(request.json ? { response_format: { type: 'json_object' } } : {}),
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
    this.logger.log(`← OpenAI chat responded ${response.status} in ${elapsed}ms`);

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content;

    if (!text) {
      this.logger.error('OpenAI returned no text content');
      throw new ServiceUnavailableException('O serviço de IA não retornou texto.');
    }

    return { text };
  }
}
