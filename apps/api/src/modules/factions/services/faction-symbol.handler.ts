import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  QueueConsumerRegistry,
  QueueJobHandler,
} from '@shared/providers/queue/queue-consumer';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  GENERATE_FACTION_SYMBOL_JOB,
  GenerateFactionSymbolPayload,
} from '../faction.constants';
import { FactionsService } from './factions.service';

/**
 * Consumes the faction symbol generation job. Registers itself with the
 * QueueConsumerRegistry so the BullMQ worker host (shared infra) dispatches
 * jobs here — this class imports NO queue backend, keeping the faction module
 * free of BullMQ.
 */
@Injectable()
export class FactionSymbolHandler implements QueueJobHandler, OnModuleInit {
  readonly queue = AI_IMAGE_QUEUE;
  readonly name = GENERATE_FACTION_SYMBOL_JOB;

  constructor(
    private readonly registry: QueueConsumerRegistry,
    private readonly factions: FactionsService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(payload: unknown): Promise<void> {
    return this.factions.processGenerationJob(
      payload as GenerateFactionSymbolPayload,
    );
  }
}
