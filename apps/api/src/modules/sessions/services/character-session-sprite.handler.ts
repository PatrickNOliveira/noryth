import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_CHARACTER_SESSION_SPRITE_JOB,
  GenerateCharacterSessionSpritePayload,
} from '../session-character.constants';
import { CharacterSessionSpriteService } from './character-session-sprite.service';

/**
 * Consumes the session-sprite job. Registers with the QueueConsumerRegistry so
 * the shared BullMQ worker host dispatches jobs here — no queue backend imported.
 */
@Injectable()
export class CharacterSessionSpriteHandler
  implements QueueJobHandler, OnModuleInit
{
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_CHARACTER_SESSION_SPRITE_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly sprites: CharacterSessionSpriteService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.sprites.processSpriteJob(
      payload as GenerateCharacterSessionSpritePayload,
    );
  }
}
