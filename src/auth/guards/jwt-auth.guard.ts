import { ForbiddenException, Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, _info: any, context: ExecutionContext, _status?: any): TUser {
    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isOptional) {
      if (err instanceof ForbiddenException) {
        throw err;
      }

      return (user ?? null) as TUser;
    }

    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    return user as TUser;
  }
}
