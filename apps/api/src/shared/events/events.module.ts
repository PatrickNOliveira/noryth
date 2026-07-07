import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EVENT_DISPATCHER } from './event-dispatcher';
import { InMemoryEventDispatcher } from './in-memory-event-dispatcher';

/**
 * Domain Events infrastructure module.
 *
 * Binds the {@link EVENT_DISPATCHER} port to the in-memory adapter and exposes
 * it globally. Concrete events and their handlers arrive in future stories.
 */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' })],
  providers: [
    { provide: EVENT_DISPATCHER, useClass: InMemoryEventDispatcher },
  ],
  exports: [EVENT_DISPATCHER],
})
export class EventsModule {}
