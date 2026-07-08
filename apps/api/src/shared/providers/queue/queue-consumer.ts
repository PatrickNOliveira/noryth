import { Injectable } from '@nestjs/common';

/**
 * A consumer of a queue job. Domain modules implement this to process jobs
 * WITHOUT importing BullMQ — they register with {@link QueueConsumerRegistry},
 * and the BullMQ worker host dispatches jobs to `handle`.
 */
export interface QueueJobHandler {
  /** Queue this handler listens on. */
  readonly queue: string;
  /** Job name this handler processes. */
  readonly name: string;
  handle(payload: unknown): Promise<void>;
}

/**
 * Registry that decouples consumers from the queue backend. Handlers register
 * here on init; the worker host reads them once the app has bootstrapped.
 */
@Injectable()
export class QueueConsumerRegistry {
  private readonly handlers: QueueJobHandler[] = [];

  register(handler: QueueJobHandler): void {
    this.handlers.push(handler);
  }

  getHandlers(): readonly QueueJobHandler[] {
    return this.handlers;
  }
}
