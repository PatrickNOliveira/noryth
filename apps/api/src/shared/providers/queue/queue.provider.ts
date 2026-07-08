/**
 * QueueProvider — PORT for asynchronous job processing.
 *
 * Domain modules enqueue work through this abstraction and NEVER touch BullMQ.
 * The concrete adapter (BullMqQueueProvider) is bound to {@link QUEUE_PROVIDER}
 * in ProvidersModule and can be swapped for Kafka/SQS later without changing
 * any domain code.
 */
export interface QueueBackoff {
  type: 'fixed' | 'exponential';
  delay: number;
}

export interface QueueJobOptions {
  attempts?: number;
  delay?: number;
  backoff?: QueueBackoff;
}

export type QueueJob<TPayload> = {
  /** Logical queue name, e.g. "ai-image-generation". */
  queue: string;
  /** Job name, e.g. "generate-faction-symbol". */
  name: string;
  payload: TPayload;
  options?: QueueJobOptions;
};

export interface QueueProvider {
  enqueue<TPayload>(job: QueueJob<TPayload>): Promise<void>;
}

/** DI token used to inject a {@link QueueProvider}. */
export const QUEUE_PROVIDER = Symbol('QUEUE_PROVIDER');
