/**
 * QueueProvider — PORT for asynchronous job processing.
 *
 * Domain modules enqueue work through this abstraction. The concrete adapter
 * (BullMQ, backed by Redis) will be implemented in a future story and bound to
 * {@link QUEUE_PROVIDER}. Domain code must never import BullMQ directly.
 */
export interface QueueJobOptions {
  /** Delay in milliseconds before the job becomes eligible for processing. */
  delay?: number;
  /** Number of retry attempts on failure. */
  attempts?: number;
}

export interface QueueProvider {
  /** Adds a named job with a typed payload to the given queue. */
  add<TPayload>(
    queue: string,
    name: string,
    payload: TPayload,
    options?: QueueJobOptions,
  ): Promise<void>;
}

/** DI token used to inject a {@link QueueProvider}. */
export const QUEUE_PROVIDER = Symbol('QUEUE_PROVIDER');
