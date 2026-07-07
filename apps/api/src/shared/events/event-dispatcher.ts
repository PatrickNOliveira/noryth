import { DomainEvent } from './domain-event';

/**
 * EventDispatcher — PORT for publishing domain events.
 *
 * Domain services publish through this abstraction; how events are delivered
 * (in-memory, message broker, outbox) is an infrastructure concern hidden
 * behind the adapter bound to {@link EVENT_DISPATCHER}.
 */
export interface EventDispatcher {
  dispatch(event: DomainEvent): Promise<void>;
  dispatchAll(events: DomainEvent[]): Promise<void>;
}

/** DI token used to inject an {@link EventDispatcher}. */
export const EVENT_DISPATCHER = Symbol('EVENT_DISPATCHER');
