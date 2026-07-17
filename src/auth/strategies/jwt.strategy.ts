import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config.service';
import { AUTH_MESSAGES } from '../../common/constants';
import { JwtPayload } from '../../common/interfaces';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    appConfigService: AppConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfigService.jwt.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService
      .findById(payload.sub)
      .catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    return { sub: payload.sub, email: payload.email };
  }
}
