import { Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@staydirect/shared';
import { DbService, type Row } from '../../common/db.service.js';

function toTicket(t: Row) {
  return {
    id: t.id,
    tenantId: t.tenant_id,
    tenantName: t.tenant_name ?? null,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    lastMessage: t.last_message ?? null,
  };
}

const LIST_SQL = `
  select t.*, tn.name as tenant_name,
         (select body from ticket_message m where m.ticket_id = t.id order by m.created_at desc limit 1) as last_message
    from support_ticket t join tenant tn on tn.id = t.tenant_id`;

/** Support tickets (spec §3.11): owners write from the owner app, StayDirect answers from the admin console. */
@Injectable()
export class SupportService {
  constructor(private readonly db: DbService) {}

  // ---------------------------------------------------------------- owner side
  ownerList(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => (await this.db.query(`${LIST_SQL} order by t.updated_at desc`, [], tx)).map(toTicket));
  }

  ownerCreate(user: SessionUser, input: { subject: string; body: string; priority: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const t = (await this.db.one(
        `insert into support_ticket (tenant_id, subject, priority, created_by) values ($1, $2, $3, $4) returning id`,
        [user.tenantId, input.subject, input.priority, user.id],
        tx,
      ))!;
      await this.db.query(`insert into ticket_message (tenant_id, ticket_id, author, body) values ($1, $2, $3, $4)`, [user.tenantId, t.id, `user:${user.id}`, input.body], tx);
      return { id: t.id };
    });
  }

  ownerThread(user: SessionUser, ticketId: string) {
    return this.db.withTenant(user.tenantId, (tx) => this.thread(tx, ticketId));
  }

  ownerReply(user: SessionUser, ticketId: string, body: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.reply(tx, ticketId, `user:${user.id}`, body, 'open');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- admin side (system context)
  async adminList(status?: string) {
    const rows = await this.db.query(`${LIST_SQL} ${status ? 'where t.status = $1' : ''} order by (t.priority = 'urgent') desc, t.updated_at desc limit 300`, status ? [status] : []);
    return rows.map(toTicket);
  }

  adminThread(ticketId: string) {
    return this.thread(this.db.pool, ticketId);
  }

  async adminReply(ticketId: string, admin: string, body: string) {
    await this.reply(this.db.pool, ticketId, `admin:${admin}`, body, 'pending');
    return { ok: true };
  }

  async adminSetStatus(ticketId: string, status: string) {
    const r = await this.db.one(`update support_ticket set status = $2, updated_at = now() where id = $1 returning id`, [ticketId, status]);
    if (!r) throw new NotFoundException('Ticket not found');
    return { ok: true };
  }

  // ---------------------------------------------------------------- shared
  private async thread(db: Parameters<DbService['query']>[2], ticketId: string) {
    const t = await this.db.one(`${LIST_SQL} where t.id = $1`, [ticketId], db);
    if (!t) throw new NotFoundException('Ticket not found');
    const messages = await this.db.query(`select author, body, created_at from ticket_message where ticket_id = $1 order by created_at`, [ticketId], db);
    return { ticket: toTicket(t), messages: messages.map((m) => ({ author: m.author, fromStaff: m.author.startsWith('admin:'), body: m.body, createdAt: m.created_at })) };
  }

  /** A reply reopens the ticket for the other side: owner reply → open, StayDirect reply → pending (waiting on owner). */
  private async reply(db: Parameters<DbService['query']>[2], ticketId: string, author: string, body: string, status: string) {
    const t = await this.db.one(`select tenant_id from support_ticket where id = $1`, [ticketId], db);
    if (!t) throw new NotFoundException('Ticket not found');
    await this.db.query(`insert into ticket_message (tenant_id, ticket_id, author, body) values ($1, $2, $3, $4)`, [t.tenant_id, ticketId, author, body], db);
    await this.db.query(`update support_ticket set status = $2, updated_at = now() where id = $1`, [ticketId, status], db);
  }
}
