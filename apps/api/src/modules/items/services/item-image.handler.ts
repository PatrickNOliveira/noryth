import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_ITEM_IMAGE_JOB,
  GenerateItemImagePayload,
} from '../item.constants';
import { ItemDefinitionsService } from './item-definitions.service';

/** Consumes the item image job via the shared BullMQ worker host (no backend imported). */
@Injectable()
export class ItemImageHandler implements QueueJobHandler, OnModuleInit {
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_ITEM_IMAGE_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly items: ItemDefinitionsService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.items.processGenerationJob(payload as GenerateItemImagePayload);
  }
}
