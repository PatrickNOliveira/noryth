import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_MAP_IMAGE_JOB,
  GenerateMapImagePayload,
} from '../map.constants';
import { MapsService } from './maps.service';

/**
 * Consumes the map image job. Registers with the QueueConsumerRegistry so the
 * shared BullMQ worker host dispatches jobs here — no queue backend imported,
 * keeping the maps module free of BullMQ.
 */
@Injectable()
export class MapImageHandler implements QueueJobHandler, OnModuleInit {
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_MAP_IMAGE_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly maps: MapsService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.maps.processGenerationJob(payload as GenerateMapImagePayload);
  }
}
