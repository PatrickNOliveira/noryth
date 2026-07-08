import { User } from './entities/user.entity';

/**
 * Persistence PORT for users. The application/domain layer depends on this
 * interface; the TypeORM adapter implements it. Swapping the datastore never
 * touches domain logic.
 */
export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export interface UsersRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
}

/** DI token used to inject a {@link UsersRepository}. */
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
