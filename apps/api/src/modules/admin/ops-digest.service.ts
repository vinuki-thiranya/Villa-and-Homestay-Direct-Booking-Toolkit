import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../../common/db.service.js';
import { takeJobFailures } from '../../common/job-health.js';
import { CONFIG, type AppConfig } from '../../config.js';
import type { RetentionResult } from '../guests/privacy.service.js';
import { EmailChannel } from '../notifications/channels.js';
import { AdminService } from './admin.service.js';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Section {
  title: string;
  lines: string[];
  /** Counts toward "need attention" in the subject. */
  problem: boolean;
}

/**
 * The founder's daily email (spec §11 Monitoring): what broke in the last 24 hours, so you can call an
 * owner before they notice (spec §9 Support model). Errors themselves are in Sentry.
 */
@Injectable()
export class OpsDigestService {
  constructor(
    private readonly db: DbService,
    private readonly admin: AdminService,
    private readonly email: EmailChannel,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  async send(retention: RetentionResult | null): Promise<{ sent: boolean; attention: number; subject: string; text: string }> {
    const sections = await this.collect(retention);
    const attention = sections.filter((s) => s.problem).reduce((n, s) => n + s.lines.length, 0);
    const day = new Date().toISOString().slice(0, 10);
    const subject = `StayDirect ops ${day}: ${attention ? `${attention} need${attention === 1 ? 's' : ''} attention` : 'all clear'}`;
    const text = sections.map((s) => `${s.title}\n${s.lines.length ? s.lines.map((l) => `- ${l}`).join('\n') : '- none'}`).join('\n\n');
    const html = sections
      .map((s) => `<h3 style="margin:16px 0 4px">${esc(s.title)}</h3>${s.lines.length ? `<ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p style="color:#666">None</p>'}`)
      .join('');
    if (!this.config.OPS_EMAIL) return { sent: false, attention, subject, text };
    const r = await this.email.send({ to: this.config.OPS_EMAIL, subject, text, html: `<div style="font-family:sans-serif">${html}</div>` });
    return { sent: r.ok, attention, subject, text };
  }

  private async collect(retention: RetentionResult | null): Promise<Section[]> {
    const [sync, conflicts, messages, channels, bookings, overview] = await Promise.all([
      this.db.query(
        `select p.name as property, h.room_name, h.channel, h.consecutive_failures, h.last_error
           from v_sync_health h join property p on p.id = h.property_id
          where h.consecutive_failures > 0 order by h.consecutive_failures desc limit 25`,
      ),
      this.db.query(
        `select p.name as property, count(*)::int as n from sync_conflict c join room r on r.id = c.room_id join property p on p.id = r.property_id
          where c.resolved_at is null group by p.name order by n desc limit 25`,
      ),
      this.db.query(
        `select channel, count(*)::int as n, max(error) as error from message
          where status = 'failed' and created_at > now() - interval '24 hours' group by channel`,
      ),
      this.db.query(
        `select partner, count(*)::int as n, max(error) as error from channel_event
          where error is not null and received_at > now() - interval '24 hours' group by partner`,
      ),
      this.db.query(
        `select source, count(*)::int as n from booking
          where created_at > now() - interval '24 hours' and status in ('pending', 'confirmed', 'checked_in', 'checked_out')
          group by source order by n desc`,
      ),
      this.admin.overview(),
    ]);
    const jobs = takeJobFailures();
    const byJob = new Map<string, { n: number; error: string }>();
    for (const f of jobs.failures) byJob.set(f.name, { n: (byJob.get(f.name)?.n ?? 0) + 1, error: f.error });

    return [
      {
        title: 'iCal feeds failing',
        problem: true,
        lines: sync.map((s) => `${s.property} · ${s.room_name} · ${s.channel}: ${s.consecutive_failures} failed in a row (${s.last_error ?? 'no error text'})`),
      },
      { title: 'Open double-booking conflicts', problem: true, lines: conflicts.map((c) => `${c.property}: ${c.n} night(s)`) },
      { title: 'Messages that failed (24 h)', problem: true, lines: messages.map((m) => `${m.channel}: ${m.n} (last error: ${m.error ?? 'unknown'})`) },
      { title: 'OTA channel errors (24 h)', problem: true, lines: channels.map((c) => `${c.partner}: ${c.n} (${c.error})`) },
      {
        title: `Background jobs that failed (since ${jobs.since.toISOString().slice(0, 16).replace('T', ' ')} UTC)`,
        problem: true,
        lines: [...byJob].map(([name, f]) => `${name}: ${f.n}× (${f.error})`),
      },
      {
        title: 'Billing and support',
        problem: true,
        lines: [
          ...(overview.billingIssues ? [`${overview.billingIssues} tenant(s) in grace or suspended`] : []),
          ...(overview.openTickets ? [`${overview.openTickets} open support ticket(s)`] : []),
        ],
      },
      {
        title: 'Platform',
        problem: false,
        lines: [
          `${overview.tenants} tenant(s), ${overview.properties} propert${overview.properties === 1 ? 'y' : 'ies'}`,
          `New bookings (24 h): ${bookings.length ? bookings.map((b) => `${b.source} ${b.n}`).join(', ') : 'none'}`,
          `Direct bookings (30 days): ${overview.directBookings30d}`,
          `Commission owed: LKR ${Number(overview.owedLkr).toLocaleString('en-US')}`,
          ...(retention ? [`Privacy retention: ${retention.messages} message(s) deleted, ${retention.guests} guest(s) anonymised`] : []),
        ],
      },
    ];
  }
}
