import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_CHARACTER_FORM_IMAGE_JOB,
  GenerateCharacterFormImagePayload,
} from '../character-form.constants';
import { CharacterFormImageService } from './character-form-image.service';

/**
 * Consumes the form-image job. Registers with the QueueConsumerRegistry so the
 * shared BullMQ worker host dispatches jobs here — no queue backend imported.
 */
@Injectable()
export class CharacterFormImageHandler implements QueueJobHandler, OnModuleInit {
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_CHARACTER_FORM_IMAGE_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly images: CharacterFormImageService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.images.processFormImageJob(
      payload as GenerateCharacterFormImagePayload,
    );
  }
}
