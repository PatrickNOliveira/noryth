import { User } from '../entities/user.entity';

/**
 * Safe public view of a user. `passwordHash` is intentionally absent — this is
 * the only shape that ever leaves the API.
 */
export interface UserDto {
  id: string;
  name: string;
  email: string;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
