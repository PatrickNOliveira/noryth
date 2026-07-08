import { Global, Module, Provider } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage/storage.provider';
import { MinioStorageProvider } from './storage/minio-storage.provider';
import { IMAGE_GENERATION_PROVIDER } from './image-generation/image-generation.provider';
import { OpenAIImageGenerationProvider } from './image-generation/openai-image-generation.provider';
import { TEXT_GENERATION_PROVIDER } from './text-generation/text-generation.provider';
import { OpenAITextGenerationProvider } from './text-generation/openai-text-generation.provider';
import { QUEUE_PROVIDER } from './queue/queue.provider';
import { BullMqQueueProvider } from './queue/bullmq-queue.provider';
import { BullMqWorkerHost } from './queue/bullmq-worker.host';
import { QueueConsumerRegistry } from './queue/queue-consumer';
import { REALTIME_PROVIDER } from './realtime/realtime.provider';
import { SocketIoRealtimeGateway } from './realtime/socketio-realtime.gateway';

/**
 * Central place where technology adapters are bound to their provider PORTS.
 *
 * Domain modules inject the token, never the implementation — so swapping an
 * adapter never touches domain code.
 *
 * Bound so far:
 *   STORAGE_PROVIDER          → MinioStorageProvider
 *   IMAGE_GENERATION_PROVIDER → OpenAIImageGenerationProvider
 *   TEXT_GENERATION_PROVIDER  → OpenAITextGenerationProvider
 *   QUEUE_PROVIDER            → BullMqQueueProvider (+ BullMqWorkerHost consumer)
 *   REALTIME_PROVIDER         → SocketIoRealtimeGateway
 *
 * Still pending future stories: CACHE (Redis).
 */
const adapters: Provider[] = [
  { provide: STORAGE_PROVIDER, useClass: MinioStorageProvider },
  { provide: IMAGE_GENERATION_PROVIDER, useClass: OpenAIImageGenerationProvider },
  { provide: TEXT_GENERATION_PROVIDER, useClass: OpenAITextGenerationProvider },
  { provide: QUEUE_PROVIDER, useClass: BullMqQueueProvider },
  QueueConsumerRegistry,
  BullMqWorkerHost,
  SocketIoRealtimeGateway,
  { provide: REALTIME_PROVIDER, useExisting: SocketIoRealtimeGateway },
];

@Global()
@Module({
  providers: adapters,
  exports: [
    STORAGE_PROVIDER,
    IMAGE_GENERATION_PROVIDER,
    TEXT_GENERATION_PROVIDER,
    QUEUE_PROVIDER,
    QueueConsumerRegistry,
    REALTIME_PROVIDER,
  ],
})
export class ProvidersModule {}
