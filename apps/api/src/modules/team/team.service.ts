import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { SmsChannel, WhatsAppChannel } from '../notifications/channels.js';

/**
 * Team members (spec §5: "manager invites by link; role-based permissions"). Managers and staff can
 * be limited to some properties (user_property); the limit is enforced by RLS (0003 property_scope).
 */
@Injectable()
export class TeamService {
  constructor(
    private readonly db: DbService,
    private readonly sms: SmsChannel,
    private readonly whatsapp: WhatsAppChannel,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  private inviteUrl(token: string): string {
    return `${this.config.OWNER_APP_URL.replace(/\/$/, '')}/login?invite=${token}`;
  }

  list(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const users = await this.db.query(
        `select u.id, u.name, u.phone, u.role, u.created_at,
                coalesce(array_agg(up.property_id) filter (where up.property_id is not null), '{}') as property_ids
           from app_user u left join user_property up on up.user_id = u.id
          group by u.id order by (u.role = 'owner') desc, u.created_at`,
        [],
        tx,
      );
      const invites = await this.db.query(
        `select id, name, phone, role, property_ids, expires_at, token from invite
          where accepted_at is null and revoked_at is null and expires_at > now() order by created_at desc`,
        [],
        tx,
      );
      return {
        members: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, propertyIds: u.property_ids, since: u.created_at })),
        invites: invites.map((i) => ({ id: i.id, name: i.name, phone: i.phone, role: i.role, propertyIds: i.property_ids, expiresAt: i.expires_at, url: this.inviteUrl(i.token) })),
      };
    });
  }

  async invite(user: SessionUser, input: { name: string; phone: string; role: 'manager' | 'staff'; propertyIds: string[] }) {
    if (user.role !== 'owner') throw new ForbiddenException('Only the owner can invite team members');
    const invite = await this.db.withTenant(user.tenantId, async (tx) => {
      await this.assertProperties(tx, input.propertyIds);
      const taken = await this.db.one(`select 1 from app_user where phone = $1`, [input.phone]);
      if (taken) throw new ConflictException('That phone number already has a StayDirect account');
      return (await this.db.one(
        `insert into invite (tenant_id, name, phone, role, property_ids, invited_by) values ($1, $2, $3, $4, $5, $6) returning *`,
        [user.tenantId, input.name, input.phone, input.role, input.propertyIds, user.id],
        tx,
      ))!;
    });
    const url = this.inviteUrl(invite.token);
    const text = `${user.name || 'Your host'} invited you to manage their property on StayDirect. Sign in with this number: ${url}`;
    const sent = await this.whatsapp.sendNamedTemplate(input.phone, 'owner_alert', 'en', { property: 'StayDirect', text }).catch(() => null);
    if (!sent?.ok) await this.sms.send(input.phone, text);
    return { id: invite.id, url, expiresAt: invite.expires_at };
  }

  revokeInvite(user: SessionUser, inviteId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update invite set revoked_at = now() where id = $1 and accepted_at is null returning id`, [inviteId], tx);
      if (!r) throw new NotFoundException('Invite not found');
      return { ok: true };
    });
  }

  updateMember(user: SessionUser, memberId: string, input: { role?: 'manager' | 'staff'; propertyIds?: string[] }) {
    if (user.role !== 'owner') throw new ForbiddenException('Only the owner can change access');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const m = await this.db.one(`select id, role from app_user where id = $1`, [memberId], tx);
      if (!m) throw new NotFoundException('Team member not found');
      if (m.role === 'owner') throw new BadRequestException('The owner always has access to every property');
      if (input.role) await this.db.query(`update app_user set role = $2 where id = $1`, [memberId, input.role], tx);
      if (input.propertyIds) {
        await this.assertProperties(tx, input.propertyIds);
        await this.db.query(`delete from user_property where user_id = $1`, [memberId], tx);
        for (const pid of input.propertyIds) {
          await this.db.query(`insert into user_property (tenant_id, user_id, property_id) values ($1, $2, $3)`, [user.tenantId, memberId, pid], tx);
        }
      }
      return { ok: true };
    });
  }

  removeMember(user: SessionUser, memberId: string) {
    if (user.role !== 'owner') throw new ForbiddenException('Only the owner can remove team members');
    return this.db.withTenant(user.tenantId, async (tx) => {
      const m = await this.db.one(`select role from app_user where id = $1`, [memberId], tx);
      if (!m) throw new NotFoundException('Team member not found');
      if (m.role === 'owner') throw new BadRequestException('The owner cannot be removed');
      await this.db.query(`delete from user_property where user_id = $1`, [memberId], tx);
      await this.db.query(`delete from app_user where id = $1`, [memberId], tx);
      return { ok: true };
    });
  }

  /** Called by AuthService when a new phone signs in with an invite token. Returns the new user. */
  async accept(tx: pg.PoolClient, token: string, phone: string) {
    const invite = await this.db.one(
      `select * from invite where token = $1 and accepted_at is null and revoked_at is null and expires_at > now() for update`,
      [token],
      tx,
    );
    if (!invite) throw new BadRequestException('This invite link has expired or was already used');
    if (invite.phone !== phone) throw new ForbiddenException('This invite was sent to a different phone number');
    const u = (await this.db.one(
      `insert into app_user (tenant_id, phone, name, role) values ($1, $2, $3, $4) returning *`,
      [invite.tenant_id, phone, invite.name, invite.role],
      tx,
    ))!;
    for (const pid of invite.property_ids as string[]) {
      await this.db.query(`insert into user_property (tenant_id, user_id, property_id) values ($1, $2, $3)`, [invite.tenant_id, u.id, pid], tx);
    }
    await this.db.query(`update invite set accepted_at = now(), accepted_user_id = $2 where id = $1`, [invite.id, u.id], tx);
    return u;
  }

  private async assertProperties(tx: pg.PoolClient, ids: string[]) {
    if (ids.length === 0) return;
    const found = await this.db.query(`select id from property where id = any($1::uuid[])`, [ids], tx);
    if (found.length !== new Set(ids).size) throw new NotFoundException('One of the properties was not found');
  }
}
