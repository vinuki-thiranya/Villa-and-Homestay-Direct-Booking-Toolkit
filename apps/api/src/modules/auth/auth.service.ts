import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthResult, SessionUser } from '@staydirect/shared';
import { TokenService } from '../../common/auth.js';
import { otpCode, sha256 } from '../../common/crypto.js';
import { DbService } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { SmsChannel } from '../notifications/channels.js';

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;

/** Owner login by phone OTP (spec §5 security). First login creates the tenant and owner user. */
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly tokens: TokenService,
    private readonly sms: SmsChannel,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private hash(phone: string, code: string): string {
    return sha256(`${phone}:${code}:${this.config.JWT_SECRET}`);
  }

  async requestOtp(phone: string): Promise<{ sent: true; devCode?: string }> {
    const recent = await this.db.one<{ n: number }>(
      `select count(*)::int as n from otp_code where phone = $1 and created_at > now() - interval '1 hour'`,
      [phone],
    );
    if ((recent?.n ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      throw new HttpException('Too many codes requested. Try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = otpCode();
    await this.db.query(`insert into otp_code (phone, code_hash, expires_at) values ($1, $2, $3)`, [
      phone,
      this.hash(phone, code),
      new Date(Date.now() + OTP_TTL_MS),
    ]);
    const res = await this.sms.send(phone, `Your StayDirect LK code is ${code}. It expires in 5 minutes.`);
    if (!res.ok) throw new HttpException('Could not send the SMS. Please try again.', HttpStatus.BAD_GATEWAY);
    return { sent: true };
  }

  async verifyOtp(phone: string, code: string, name?: string): Promise<AuthResult> {
    const devOk = this.config.SMS_PROVIDER === 'console' && this.config.OTP_DEV_CODE && code === this.config.OTP_DEV_CODE;
    if (!devOk) {
      const otp = await this.db.one(
        `select * from otp_code where phone = $1 and consumed_at is null and expires_at > now()
          order by created_at desc limit 1`,
        [phone],
      );
      if (!otp || otp.attempts >= MAX_ATTEMPTS) throw new UnauthorizedException('Code expired. Request a new one.');
      if (otp.code_hash !== this.hash(phone, code)) {
        await this.db.query(`update otp_code set attempts = attempts + 1 where id = $1`, [otp.id]);
        throw new UnauthorizedException('Wrong code');
      }
      await this.db.query(`update otp_code set consumed_at = now() where id = $1`, [otp.id]);
    }

    const existing = await this.db.one(`select * from app_user where phone = $1`, [phone]);
    if (existing) {
      const user: SessionUser = { id: existing.id, tenantId: existing.tenant_id, phone, name: existing.name, role: existing.role };
      return { token: await this.tokens.sign(user), user, isNew: false };
    }
    const user = await this.db.tx(async (tx) => {
      const displayName = name?.trim() || 'New owner';
      const tenant = await this.db.one(`insert into tenant (name) values ($1) returning id`, [displayName], tx);
      const u = await this.db.one(
        `insert into app_user (tenant_id, phone, name, role) values ($1, $2, $3, 'owner') returning *`,
        [tenant!.id, phone, displayName],
        tx,
      );
      return { id: u!.id, tenantId: tenant!.id, phone, name: displayName, role: 'owner' as const };
    });
    return { token: await this.tokens.sign(user), user, isNew: true };
  }

  async me(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const u = await this.db.one(`select id, tenant_id, phone, email, name, role, language from app_user where id = $1`, [user.id], tx);
      const t = await this.db.one(`select id, name, plan, billing_status, base_currency from tenant where id = $1`, [user.tenantId], tx);
      return { user: u, tenant: t };
    });
  }
}
