import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';

/**
 * User aggregate. `passwordHash` is stored here but must never be serialized
 * back to clients — serialization is handled by mapping to plain objects that
 * omit it (see UsersService / auth response).
 *
 * The unique index on `email` is named to match the initial migration
 * (`IDX_users_email`).
 */
@Entity({ name: 'users' })
@Index('IDX_users_email', ['email'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;
}
