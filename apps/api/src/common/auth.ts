import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUser, UserRole } from '@staydirect/shared';
import { jwtVerify, SignJWT } from 'jose';
import { CONFIG, type AppConfig } from '../config.js';

@Injectable()
export class TokenService {
  private readonly secret: Uint8Array;
  constructor(@Inject(CONFIG) config: AppConfig) {
    this.secret = new TextEncoder().encode(config.JWT_SECRET);
  }

  sign(user: SessionUser): Promise<string> {
    return new SignJWT({ tid: user.tenantId, role: user.role, phone: user.phone, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(this.secret);
  }

  async verify(token: string): Promise<SessionUser> {
    const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'] });
    return {
      id: payload.sub as string,
      tenantId: payload.tid as string,
      role: payload.role as UserRole,
      phone: payload.phone as string,
      name: (payload.name as string) ?? '',
    };
  }
}

const ROLES_KEY = 'roles';
/** Restrict an owner endpoint to roles. Default for authenticated routes: owner and manager. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      req.user = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const roles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) ??
      (['owner', 'manager'] as UserRole[]);
    if (!roles.includes(req.user.role)) throw new ForbiddenException('Not allowed for your role');
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest().user;
});
