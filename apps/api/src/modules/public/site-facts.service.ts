import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { addDays, diffDays, isIsoDate, todayIn, type SiteCalendar } from '@staydirect/shared';
import { DbService, type Row } from '../../common/db.service.js';
import { RevalidateService } from '../../common/revalidate.service.js';

const FACTS_TTL_MS = 10 * 60_000;
const CALENDAR_TTL_MS = 60_000;
const MAX_CALENDAR_DAYS = 400;
/** Fewer answered messages than this and "usually replies within…" would be noise. */
const MIN_REPLIES = 3;

/** Trust facts and the closed-nights calendar for the guest site (spec §12 Prompt 5). */
@Injectable()
export class SiteFactsService {
  private factCache = new Map<string, { at: number; value: { average: number | null; count: number; responseMinutes: number | null } }>();
  private calendars = new Map<string, { at: number; value: SiteCalendar }>();

  constructor(
    private readonly db: DbService,
    @Optional() revalidate?: RevalidateService,
  ) {
    // A new review or changed nights must not wait out the cache: drop the property's entries.
    revalidate?.onChange((propertyId) => {
      this.factCache.delete(propertyId);
      for (const key of this.calendars.keys()) if (key.startsWith(`${propertyId}:`)) this.calendars.delete(key);
    });
  }

  async facts(propertyId: string) {
    const hit = this.factCache.get(propertyId);
    if (hit && Date.now() - hit.at < FACTS_TTL_MS) return hit.value;
    const [reviews, reply] = await Promise.all([
      this.db.one<{ avg: number | null; n: number }>(
        `select round(avg(rating)::numeric, 1) as avg, count(*)::int as n from review where property_id = $1`, // every rating, not only published texts
        [propertyId],
      ),
      // Median time from a guest's message to the first human or AI answer after it; automatic
      // sequence messages ('system') do not count as replies.
      this.db.one<{ minutes: number | null; n: number }>(
        `with asked as (
           select m.conversation_id, m.created_at,
                  (select min(o.created_at) from message o
                    where o.conversation_id = m.conversation_id and o.direction = 'out'
                      and coalesce(o.sent_by, '') <> 'system' and o.created_at >= m.created_at) as replied_at
             from message m
            where m.property_id = $1 and m.conversation_id is not null and m.direction = 'in'
              and m.created_at > now() - interval '90 days'),
         turns as (
           select min(created_at) as asked_at, replied_at from asked where replied_at is not null
            group by conversation_id, replied_at)
         select round(percentile_cont(0.5) within group (order by extract(epoch from replied_at - asked_at)) / 60)::int as minutes,
                count(*)::int as n
           from turns`,
        [propertyId],
      ),
    ]);
    const value = {
      average: reviews?.avg ?? null,
      count: reviews?.n ?? 0,
      responseMinutes: reply && reply.n >= MIN_REPLIES ? Math.max(1, reply.minutes ?? 1) : null,
    };
    this.factCache.set(propertyId, { at: Date.now(), value });
    return value;
  }

  /** Nights in [from, to) on which every active room is held, reserved or blocked. */
  async calendar(property: Row, from?: string, to?: string): Promise<SiteCalendar> {
    const today = todayIn(property.timezone);
    const start = from && isIsoDate(from) && from > today ? from : today;
    const end = to && isIsoDate(to) ? to : addDays(start, 180);
    if (end <= start) throw new BadRequestException('to must be after from');
    if (diffDays(start, end) > MAX_CALENDAR_DAYS) throw new BadRequestException(`At most ${MAX_CALENDAR_DAYS} days`);

    const key = `${property.id}:${start}:${end}`;
    const hit = this.calendars.get(key);
    if (hit && Date.now() - hit.at < CALENDAR_TTL_MS) return hit.value;

    const rows = await this.db.query<{ date: string }>(
      `with rooms as (select id from room where property_id = $1 and active)
       select n.date from night_inventory n
        where n.room_id in (select id from rooms) and n.status in ('held', 'reserved', 'blocked')
          and n.date >= $2 and n.date < $3
        group by n.date
       having count(distinct n.room_id) >= (select count(*) from rooms)
        order by n.date`,
      [property.id, start, end],
    );
    const value = { from: start, to: end, closed: rows.map((r) => r.date) };
    if (this.calendars.size > 500) this.calendars.clear();
    this.calendars.set(key, { at: Date.now(), value });
    return value;
  }
}
