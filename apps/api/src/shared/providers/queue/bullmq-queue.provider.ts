import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EnvironmentVariables } from '@shared/config/env.validation';
import { QueueJob, QueueProvider } from './queue.provider';
import { buildRedisConnection, RedisConnection } from './redis.connection';

/**
 * BullMQ adapter for {@link QueueProvider} (the PRODUCER side). The only file —
 * together with the worker host — that imports BullMQ. Domain modules depend on
 * the port, never on this class.
 */
@Injectable()
export class BullMqQueueProvider implements QueueProvider, OnModuleDestroy {
  private readonly logger = new Logger(BullMqQueueProvider.name);
  private readonly connection: RedisConnection | null;
  private readonly queues = new Map<string, Queue>();

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.connection = buildRedisConnection(config);
  }

  async enqueue<TPayload>(job: QueueJob<TPayload>): Promise<void> {
    const queue = this.getQueue(job.queue);
    await queue.add(job.name, job.payload, {
      attempts: job.options?.attempts,
      delay: job.options?.delay,
      backoff: job.options?.backoff,
      removeOnComplete: true,
      removeOnFail: 200,
    });
  }

  private getQueue(name: string): Queue {
    if (!this.connection) {
      throw new ServiceUnavailableException(
        'Fila indisponível: REDIS_HOST não configurado.',
      );
    }
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.connection });
      this.queues.set(name, queue);
      this.logger.log(`Queue "${name}" ready`);
    }
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close().catch(() => undefined);
    }
  }
}
