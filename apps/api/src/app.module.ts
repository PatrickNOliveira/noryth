import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@shared/config/config.module';
import { EnvironmentVariables } from '@shared/config/env.validation';
import { buildTypeOrmOptions } from '@shared/config/database.config';
import { EventsModule } from '@shared/events/events.module';
import { ProvidersModule } from '@shared/providers/providers.module';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';

/**
 * Composition root. Wires global infrastructure (config, database, events,
 * providers) and the domain modules. Authentication is enforced globally; only
 * routes marked `@Public()` are exempt.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildTypeOrmOptions(config),
    }),
    EventsModule,
    ProvidersModule,
    UsersModule,
    AuthModule,
    CampaignsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
