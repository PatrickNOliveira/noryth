import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from '@shared/utils/hash.util';
import { User } from './entities/user.entity';
import {
  CreateUserData,
  USERS_REPOSITORY,
  UsersRepository,
} from './users.repository';

export interface RegisterUserInput {
  name: string;
  email: string;
  /** Plain-text password; hashed here before persistence. */
  password: string;
}

/**
 * Application service for users. Owns the invariants "email is unique" and
 * "passwords are always stored hashed". Knows nothing about HTTP or JWT.
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly users: UsersRepository,
  ) {}

  async register(input: RegisterUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();

    if (await this.users.existsByEmail(email)) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const data: CreateUserData = {
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
    };
    return this.users.create(data);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email.trim().toLowerCase());
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  /** Batch lookup used to hydrate participant lists with names/emails. */
  findByIds(ids: string[]): Promise<User[]> {
    return this.users.findByIds(ids);
  }
}
