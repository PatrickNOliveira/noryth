import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './domain-event';
import { EventDispatcher } from './event-dispatcher';

/**
 * Default in-memory adapter for {@link EventDispatcher}, backed by Nest's
 * EventEmitter2. Suitable for single-process delivery. A durable adapter
 * (outbox + broker) can replace it later without touching domain code.
 *
 * No concrete domain events are dispatched in this story — this is the
 * infrastructure they will eventually flow through.
 */
@Injectable()
export class InMemoryEventDispatcher implements EventDispatcher {
  private readonly logger = new Logger(InMemoryEventDispatcher.name);

  constructor(private readonly emitter: EventEmitter2) {}

  async dispatch(event: DomainEvent): Promise<void> {
    this.logger.debug(`Dispatching domain event "${event.eventName}"`);
    await this.emitter.emitAsync(event.eventName, event);
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }
}
