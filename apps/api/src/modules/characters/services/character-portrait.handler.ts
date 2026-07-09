import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_CHARACTER_PORTRAIT_JOB,
  GenerateCharacterPortraitPayload,
} from '../character.constants';
import { CharactersService } from './characters.service';

/**
 * Consumes the character portrait job. Registers with the QueueConsumerRegistry
 * so the shared BullMQ worker host dispatches jobs here — this class imports NO
 * queue backend, keeping the characters module free of BullMQ.
 */
@Injectable()
export class CharacterPortraitHandler implements QueueJobHandler, OnModuleInit {
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_CHARACTER_PORTRAIT_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly characters: CharactersService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.characters.processGenerationJob(
      payload as GenerateCharacterPortraitPayload,
    );
  }
}
