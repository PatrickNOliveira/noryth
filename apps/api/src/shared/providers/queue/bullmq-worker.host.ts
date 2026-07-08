import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { EnvironmentVariables } from '@shared/config/env.validation';
import { QueueConsumerRegistry } from './queue-consumer';
import { buildRedisConnection, RedisConnection } from './redis.connection';

/**
 * BullMQ adapter for the CONSUMER side. Reads the handlers registered by domain
 * modules (which know nothing about BullMQ) and spins up one Worker per queue,
 * dispatching each job to the matching handler by name.
 *
 * Kept in shared infrastructure so BullMQ never leaks into a domain module, and
 * so a dedicated worker process can be extracted later by running only this.
 */
@Injectable()
export class BullMqWorkerHost implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BullMqWorkerHost.name);
  private readonly connection: RedisConnection | null;
  private readonly workers: Worker[] = [];

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly registry: QueueConsumerRegistry,
  ) {
    this.connection = buildRedisConnection(config);
  }

  onApplicationBootstrap(): void {
    if (!this.connection) {
      this.logger.warn('REDIS_HOST not set — queue workers are NOT running.');
      return;
    }
    const handlers = this.registry.getHandlers();
    const queues = new Set(handlers.map((h) => h.queue));

    for (const queueName of queues) {
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          const handler = handlers.find(
            (h) => h.queue === queueName && h.name === job.name,
          );
          if (!handler) {
            this.logger.warn(`No handler for ${queueName}/${job.name}`);
            return;
          }
          const startedAt = Date.now();
          this.logger.log(
            `⇢ Job ${job.id} "${job.name}" started (attempt ${job.attemptsMade + 1})`,
          );
          await handler.handle(job.data);
          this.logger.log(
            `⇠ Job ${job.id} "${job.name}" finished in ${Date.now() - startedAt}ms`,
          );
        },
        { connection: this.connection, concurrency: 2 },
      );

      worker.on('failed', (job, err) =>
        this.logger.error(
          `Job ${job?.id ?? '?'} "${job?.name ?? '?'}" failed (attempt ${job?.attemptsMade ?? '?'}): ${err.message}`,
        ),
      );
      this.workers.push(worker);
      this.logger.log(`Worker started for queue "${queueName}"`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close().catch(() => undefined);
    }
  }
}
