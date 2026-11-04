import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { addDays, ICAL_FAILURE_ALERT_THRESHOLD, todayIn } from '@staydirect/shared';
import { sha256 } from '../../common/crypto.js';
import { DbService } from '../../common/db.service.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { buildIcal, feedNights, parseIcal, type ExportNight } from './ical.js';

const MAX_FEED_BYTES = 2 * 1024 * 1024;
/** How far ahead imported nights are managed. */
const HORIZON_DAYS = 550;

export interface SyncOutcome {
  sourceId: string;
  ok: boolean;
  skipped?: boolean;
  added: number;
  released: number;
  conflicts: number;
  error?: string;
}

/**
 * iCal worker (spec §4.6): fetch → parse → diff → write nights → detect conflicts → alert.
 * A failed fetch or parse never releases nights; only a successful parse can.
 */
@Injectable()
export class IcalService {
  private readonly log = new Logger(IcalService.name);

  constructor(
    private readonly db: DbService,
    private readonly inventory: InventoryService,
    private readonly availability: AvailabilityService,
    private readonly notify: NotificationsService,
  ) {}

  async syncAll(concurrency = 8): Promise<SyncOutcome[]> {
    const sources = await this.db.query<{ id: string }>(`select id from ical_source order by last_fetch_at nulls first`);
    const out: SyncOutcome[] = [];
    let i = 0;
    const workers = Array.from({ length: Math.min(concurrency, sources.length) }, async () => {
      while (i < sources.length) {
        const s = sources[i++]!;
        out.push(await this.sync(s.id).catch((err) => ({ sourceId: s.id, ok: false, added: 0, released: 0, conflicts: 0, error: String(err) })));
      }
    });
    await Promise.all(workers);
    return out;
  }

  async syncProperty(propertyId: string): Promise<SyncOutcome[]> {
    const sources = await this.db.query<{ id: string }>(
      `select s.id from ical_source s join room r on r.id = s.room_id where r.property_id = $1`,
      [propertyId],
    );
    const out: SyncOutcome[] = [];
    for (const s of sources) out.push(await this.sync(s.id, { force: true }));
    return out;
  }

  async sync(sourceId: string, opts: { force?: boolean; fetchFeed?: (url: string) => Promise<string> } = {}): Promise<SyncOutcome> {
    const src = await this.db.one(
      `select s.*, r.property_id, r.name as room_name, p.timezone,
              (select count(*)::int from sync_conflict c where c.ical_source_id = s.id and c.resolved_at is null) as open_conflicts
         from ical_source s join room r on r.id = s.room_id join property p on p.id = r.property_id
        where s.id = $1`,
      [sourceId],
    );
    if (!src) throw new NotFoundException('Calendar import not found');
    const base = { sourceId, added: 0, released: 0, conflicts: 0 };
    // A live two-way connection already brings this channel's bookings with guest details.
    const live = await this.db.one(
      `select 1 from channel_connection where property_id = $1 and status = 'active' and $2 = any(channels)`,
      [src.property_id, src.channel],
    );
    if (live) {
      await this.db.query(`update ical_source set last_fetch_at = now(), last_status = 'skipped_direct_api' where id = $1`, [sourceId]);
      return { ...base, ok: true, skipped: true };
    }

    let text: string;
    let events;
    try {
      text = await (opts.fetchFeed ?? fetchFeed)(src.url);
      events = parseIcal(text);
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      const row = await this.db.one<{ consecutive_failures: number }>(
        `update ical_source set last_fetch_at = now(), last_status = 'error', last_error = $2,
                consecutive_failures = consecutive_failures + 1
          where id = $1 returning consecutive_failures`,
        [sourceId, message],
      );
      if (row?.consecutive_failures === ICAL_FAILURE_ALERT_THRESHOLD) {
        this.notify.run(
          this.notify.ownerAlert(
            src.property_id,
            `Calendar sync for ${src.room_name} (${src.channel}) has failed ${ICAL_FAILURE_ALERT_THRESHOLD} times in a row: ${message}. Double bookings are possible until it is fixed.`,
            '/sync',
          ),
        );
      }
      return { ...base, ok: false, error: message };
    }

    const hash = sha256(text);
    if (!opts.force && hash === src.snapshot_hash && src.consecutive_failures === 0 && src.open_conflicts === 0) {
      await this.db.query(`update ical_source set last_fetch_at = now(), last_success_at = now(), last_status = 'ok' where id = $1`, [sourceId]);
      return { ...base, ok: true, skipped: true };
    }

    const today = todayIn(src.timezone);
    const wanted = feedNights(events, { from: today, to: addDays(today, HORIZON_DAYS) });
    const newConflicts: { date: string; bookingId: string | null }[] = [];

    const result = await this.db.tx(async (tx) => {
      // Serialise syncs of the same feed (worker vs "sync now").
      await this.db.query(`select id from ical_source where id = $1 for update`, [sourceId], tx);
      const existing = await this.db.query<{ id: number; date: string; external_uid: string }>(
        `select id, date, external_uid from night_inventory
          where ical_source_id = $1 and status in ('reserved', 'blocked') and date >= $2`,
        [sourceId, today],
        tx,
      );
      const have = new Map(existing.map((n) => [n.date, n]));
      const toRelease = existing.filter((n) => !wanted.has(n.date)).map((n) => n.id);
      await this.inventory.releaseOtaNights(tx, toRelease);

      let added = 0;
      for (const [date, uid] of wanted) {
        if (have.has(date)) continue;
        const occupant = await this.inventory.insertOtaNight(tx, {
          tenantId: src.tenant_id,
          roomId: src.room_id,
          date,
          source: src.channel,
          icalSourceId: sourceId,
          externalUid: uid,
        });
        if (!occupant) {
          added++;
          continue;
        }
        if (occupant.ical_source_id === sourceId) continue; // concurrent sync already wrote it
        const c = await this.db.one(
          `insert into sync_conflict (tenant_id, room_id, date, ical_source_id, channel, external_uid, booking_id)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (room_id, date, coalesce(external_uid, '')) where resolved_at is null do nothing
           returning id`,
          [src.tenant_id, src.room_id, date, sourceId, src.channel, uid, occupant.booking_id],
          tx,
        );
        if (c) newConflicts.push({ date, bookingId: occupant.booking_id });
      }

      // Conflicts disappear when the OTA no longer lists the night.
      await this.db.query(
        `update sync_conflict set resolved_at = now(), resolution = 'ota_removed'
          where ical_source_id = $1 and resolved_at is null and not (date = any($2::date[]))`,
        [sourceId, [...wanted.keys()]],
        tx,
      );
      await this.db.query(
        `update ical_source set last_fetch_at = now(), last_success_at = now(), last_status = 'ok', last_error = null,
                consecutive_failures = 0, snapshot_hash = $2
          where id = $1`,
        [sourceId, hash],
        tx,
      );
      return { added, released: toRelease.length };
    });

    this.availability.invalidate(src.property_id);
    if (newConflicts.length) await this.alertConflicts(src, newConflicts);
    return { ...base, ok: true, ...result, conflicts: newConflicts.length };
  }

  private async alertConflicts(src: Record<string, any>, conflicts: { date: string; bookingId: string | null }[]) {
    const refs = conflicts.length
      ? await this.db.query<{ id: string; reference: string }>(`select id, reference from booking where id = any($1::uuid[])`, [
          conflicts.map((c) => c.bookingId).filter(Boolean),
        ])
      : [];
    const refMap = new Map(refs.map((r) => [r.id, r.reference]));
    const dates = conflicts.map((c) => c.date).sort();
    const directRefs = [...new Set(conflicts.map((c) => (c.bookingId ? refMap.get(c.bookingId) : null)).filter(Boolean))];
    const text =
      `DOUBLE BOOKING on ${src.room_name}: ${src.channel} booked ${dates[0]}${dates.length > 1 ? ` – ${dates[dates.length - 1]} (${dates.length} nights)` : ''}` +
      ` which ${directRefs.length ? `direct booking ${directRefs.join(', ')} already holds` : 'were already blocked'}. ` +
      `Suggested: cancel the direct booking and refund, or ask ${src.channel} to relocate their guest.`;
    this.notify.run(this.notify.ownerAlert(src.property_id, text, '/conflicts'));
    await this.db.query(
      `update sync_conflict set alerted_at = now() where ical_source_id = $1 and date = any($2::date[]) and alerted_at is null`,
      [src.id, dates],
    );
  }

  // ------------------------------------------------------------------ export

  async exportFeed(token: string): Promise<string | null> {
    const room = await this.db.one(
      `select r.id, r.name, r.ical_export_token, p.timezone from room r join property p on p.id = r.property_id where r.ical_export_token = $1`,
      [token],
    );
    if (!room) return null;
    const from = addDays(todayIn(room.timezone), -7);
    const rows = await this.db.query(
      `select date, status, source, booking_id, external_uid, ical_source_id from night_inventory
        where room_id = $1 and date >= $2 and status in ('reserved', 'blocked')`,
      [room.id, from],
    );
    const nights: ExportNight[] = rows.map((n) => ({
      date: n.date,
      status: n.status,
      groupKey: n.booking_id ?? `${n.source}:${n.ical_source_id ?? ''}:${n.external_uid ?? n.status}`,
      summary: n.status === 'blocked' ? 'Not available' : 'Reserved',
    }));
    return buildIcal(room.name, room.ical_export_token, nights);
  }
}

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'StayDirectLK-CalendarSync/1.0', accept: 'text/calendar, */*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from calendar URL`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_FEED_BYTES) throw new Error('Calendar feed is too large');
  const text = await res.text();
  if (text.length > MAX_FEED_BYTES) throw new Error('Calendar feed is too large');
  return text;
}
