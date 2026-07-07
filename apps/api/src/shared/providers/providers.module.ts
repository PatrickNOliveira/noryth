import { Global, Module, Provider } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage/storage.provider';
import { MinioStorageProvider } from './storage/minio-storage.provider';

/**
 * Central place where technology adapters are bound to their provider PORTS.
 *
 * Domain modules inject the token, never the implementation — so swapping an
 * adapter never touches domain code.
 *
 * Bound so far:
 *   STORAGE_PROVIDER → MinioStorageProvider
 *
 * Still pending future stories: QUEUE (BullMQ), CACHE (Redis), REALTIME
 * (Socket.IO), AI_TEXT / IMAGE_GENERATION (OpenAI).
 */
const adapters: Provider[] = [
  { provide: STORAGE_PROVIDER, useClass: MinioStorageProvider },
];

@Global()
@Module({
  providers: adapters,
  exports: adapters,
})
export class ProvidersModule {}
