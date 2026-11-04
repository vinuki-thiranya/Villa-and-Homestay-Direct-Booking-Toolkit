import { Injectable } from '@nestjs/common';
import { todayIn, type SessionUser } from '@staydirect/shared';
import { DbService } from '../../common/db.service.js';

/**
 * Multi-property views (spec §3.9 R3, Pro Multi / Manager plans): one row per property the user
 * may see (RLS property_scope already limits managers), and a calendar across all of them.
 */
@Injectable()
export class PortfolioService {
  constructor(private readonly db: DbService) {}

  portfolio(user: SessionUser) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const props = await this.db.query(`select id, name, slug, timezone, base_currency, owner_id from property order by name`, [], tx);
      const out = [];
      for (const p of props) {
        const today = todayIn(p.timezone);
        const s = (await this.db.one(
          `select
             (select count(*)::int from booking where property_id = $1 and from_date = $2 and status in ('confirmed', 'checked_in')) as arrivals,
             (select count(*)::int from booking where property_id = $1 and to_date = $2 and status in ('confirmed', 'checked_in', 'checked_out')) as departures,
             (select count(*)::int from room where property_id = $1 and active) as rooms,
             (select count(*)::int from night_inventory n join room r on r.id = n.room_id
               where r.property_id = $1 and n.date = $2 and n.status = 'reserved') as occupied_tonight,
             (select coalesce(sum(b.total - p.paid), 0)::numeric(12,2) from booking b join v_booking_paid p on p.booking_id = b.id
               where b.property_id = $1 and b.status in ('confirmed', 'checked_in') and b.total > p.paid and b.source = 'direct') as unpaid,
             (select count(*)::int from booking where property_id = $1 and mode = 'request' and status = 'pending' and approved_at is null) as pending_approval,
             (select count(*)::int from sync_conflict c join room r on r.id = c.room_id where r.property_id = $1 and c.resolved_at is null) as conflicts,
             (select count(*)::int from v_sync_health where property_id = $1 and consecutive_failures > 0) as sync_failures,
             (select count(*)::int from conversation where property_id = $1 and status = 'needs_human') as needs_reply,
             (select count(*)::int from task where property_id = $1 and date = $2 and status not in ('done', 'skipped')) as open_tasks`,
          [p.id, today],
          tx,
        ))!;
        out.push({
          propertyId: p.id,
          name: p.name,
          slug: p.slug,
          ownerId: p.owner_id,
          currency: p.base_currency,
          today,
          arrivals: s.arrivals,
          departures: s.departures,
          rooms: s.rooms,
          occupiedTonight: s.occupied_tonight,
          occupancyTonightPct: s.rooms ? Math.round((s.occupied_tonight / s.rooms) * 100) : 0,
          unpaid: s.unpaid,
          pendingApproval: s.pending_approval,
          conflicts: s.conflicts,
          syncFailures: s.sync_failures,
          needsReply: s.needs_reply,
          openTasks: s.open_tasks,
        });
      }
      return out;
    });
  }

  calendar(user: SessionUser, from: string, to: string, propertyIds?: string[]) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const props = await this.db.query(
        `select id, name from property where ($1::uuid[] is null or id = any($1::uuid[])) order by name`,
        [propertyIds?.length ? propertyIds : null],
        tx,
      );
      const ids = props.map((p) => p.id);
      const rooms = await this.db.query(`select id, property_id, name from room where property_id = any($1::uuid[]) and active order by sort_order, name`, [ids], tx);
      const nights = await this.db.query(
        `select n.room_id, n.date, n.status, n.source, n.booking_id, b.reference, n.note, g.name as guest_name
           from night_inventory n join room r on r.id = n.room_id
           left join booking b on b.id = n.booking_id left join guest g on g.id = b.guest_id
           left join hold h on h.id = n.hold_id
          where r.property_id = any($1::uuid[]) and n.date >= $2 and n.date < $3 and n.status in ('held', 'reserved', 'blocked')
            and (n.status <> 'held' or h.expires_at >= now())
          order by n.date`,
        [ids, from, to],
        tx,
      );
      return {
        properties: props.map((p) => ({
          id: p.id,
          name: p.name,
          rooms: rooms.filter((r) => r.property_id === p.id).map((r) => ({ id: r.id, name: r.name })),
        })),
        nights: nights.map((n) => ({
          roomId: n.room_id,
          date: n.date,
          status: n.status,
          source: n.source,
          bookingId: n.booking_id,
          bookingReference: n.reference,
          guestName: n.guest_name,
          note: n.note,
        })),
      };
    });
  }
}
