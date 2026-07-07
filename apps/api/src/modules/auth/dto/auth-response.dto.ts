import { UserDto } from '@modules/users/dto/user.dto';

/** Shape returned by both /auth/register and /auth/login. */
export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}
