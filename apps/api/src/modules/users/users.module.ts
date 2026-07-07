import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import { USERS_REPOSITORY } from './users.repository';
import { UsersService } from './users.service';

/**
 * Users module. Binds the {@link USERS_REPOSITORY} port to its TypeORM adapter
 * and exposes {@link UsersService} for the auth module to consume.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UsersService,
    { provide: USERS_REPOSITORY, useClass: TypeOrmUserRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
