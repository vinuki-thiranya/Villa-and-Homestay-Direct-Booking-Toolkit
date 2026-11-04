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
import { DbService } from './db.service.js';
import { requestContext } from './request-context.js';

export interface AdminSession {
  adminId: string;
  phone: string;
  name: string;
}

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
    if (payload.adm) throw new Error('admin token');
    return {
      id: payload.sub as string,
      tenantId: payload.tid as string,
      role: payload.role as UserRole,
      phone: payload.phone as string,
      name: (payload.name as string) ?? '',
    };
  }

  /** Platform admin (StayDirect staff) tokens: short-lived, never usable on tenant endpoints. */
  signAdmin(admin: AdminSession): Promise<string> {
    return new SignJWT({ adm: true, phone: admin.phone, name: admin.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(admin.adminId)
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(this.secret);
  }

  async verifyAdmin(token: string): Promise<AdminSession> {
    const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'] });
    if (payload.adm !== true) throw new Error('not an admin token');
    return { adminId: payload.sub as string, phone: payload.phone as string, name: (payload.name as string) ?? '' };
  }
}

const ROLES_KEY = 'roles';
/** Restrict an owner endpoint to roles. Default for authenticated routes: owner and manager. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

function bearer(req: { headers: Record<string, string | undefined> }): string | null {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly reflector: Reflector,
    private readonly db: DbService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = bearer(req);
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
    // Managers and staff may be limited to some properties; read on every request so removal is immediate.
    if (req.user.role !== 'owner') {
      const rows = await this.db.query<{ property_id: string }>(`select property_id from user_property where user_id = $1`, [req.user.id]);
      const store = requestContext.getStore();
      if (store) store.propertyIds = rows.length ? rows.map((r) => r.property_id) : null;
      req.user.propertyIds = rows.length ? rows.map((r) => r.property_id) : null;
    }
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = bearer(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      req.admin = await this.tokens.verifyAdmin(token);
    } catch {
      throw new ForbiddenException('Platform admins only');
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest().user;
});

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): AdminSession => {
  return ctx.switchToHttp().getRequest().admin;
});
