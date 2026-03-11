import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.accessToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      const message = await this.i18n.translate('auth.errors.invalidToken', {
        lang: I18nContext.current().getLanguage(),
      });
      throw new UnauthorizedException(message);
    }
    if (user.isBlocked) {
      const message = await this.i18n.translate('auth.errors.accountBlocked', {
        lang: I18nContext.current().getLanguage(),
      });
      throw new ForbiddenException(message);
    }
    return user;
  }
}
