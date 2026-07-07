/**
 * Base class for all domain events.
 *
 * A domain event is an immutable record that something meaningful happened in
 * the domain. Concrete events (e.g. `CharacterCreated`, `MapGenerated`) will
 * extend this class in future stories — none exist yet.
 */
export abstract class DomainEvent<TPayload = unknown> {
  /** Stable event name used for routing/subscription, e.g. "character.created". */
  abstract readonly eventName: string;

  /** When the event occurred. */
  readonly occurredAt: Date;

  /** Event-specific data. */
  readonly payload: TPayload;

  constructor(payload: TPayload, occurredAt: Date = new Date()) {
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}
