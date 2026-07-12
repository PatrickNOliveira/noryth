import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_CHARACTER_FORM_SPRITE_JOB,
  GenerateCharacterFormSpritePayload,
} from '../character-form.constants';
import { CharacterFormSessionSpriteService } from './character-form-session-sprite.service';

/** Consumes the form session-sprite job (registers with the shared worker host). */
@Injectable()
export class CharacterFormSessionSpriteHandler
  implements QueueJobHandler, OnModuleInit
{
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_CHARACTER_FORM_SPRITE_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly sprites: CharacterFormSessionSpriteService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.sprites.processSpriteJob(
      payload as GenerateCharacterFormSpritePayload,
    );
  }
}
