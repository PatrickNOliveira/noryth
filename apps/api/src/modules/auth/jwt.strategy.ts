import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '@shared/decorators/current-user.decorator';
import { EnvironmentVariables } from '@shared/config/env.validation';
import { UsersService } from '@modules/users/users.service';

/** Claims embedded in the JWT. `sub` is the user id. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Passport JWT strategy. Validates the token signature/expiry, then confirms
 * the subject still exists before attaching the principal to the request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findByIdOrFail(payload.sub).catch(() => null);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, name: user.name };
  }
}
