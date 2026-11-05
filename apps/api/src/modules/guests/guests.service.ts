import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PUBLIC_REVIEW_MIN_RATING, type SessionUser } from '@staydirect/shared';
import { RevalidateService } from '../../common/revalidate.service.js';
import { DbService, isUniqueViolation, type Row } from '../../common/db.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CatalogService } from '../properties/catalog.service.js';

function toCode(c: Row) {
  return {
    id: c.id,
    code: c.code,
    pct: c.pct,
    guestId: c.guest_id,
    guestName: c.guest_name ?? null,
    validFrom: c.valid_from,
    expiresAt: c.expires_at,
    maxUses: c.max_uses,
    uses: c.uses,
    reason: c.reason,
    active: c.active,
  };
}

function toReview(r: Row) {
  return {
    id: r.id,
    bookingId: r.booking_id,
    bookingReference: r.reference ?? null,
    rating: r.rating,
    body: r.body,
    public: r.public,
    guestName: r.guest_name,
    ownerReply: r.owner_reply,
    createdAt: r.created_at,
  };
}

/** Guest CRM, repeat-guest discount codes and reviews (spec §3.8). */
@Injectable()
export class GuestsService {
  constructor(
    private readonly db: DbService,
    private readonly bookings: BookingsService,
    private readonly catalog: CatalogService,
    private readonly notify: NotificationsService,
    private readonly revalidate: RevalidateService,
  ) {}

  // ---------------------------------------------------------------- CRM
  listGuests(user: SessionUser, propertyId: string, search?: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const params: unknown[] = [propertyId];
      let filter = '';
      if (search) {
        params.push(`%${search}%`);
        filter = `and (g.name ilike $2 or g.email ilike $2 or g.phone ilike $2)`;
      }
      const rows = await this.db.query(
        `select g.id, g.name, g.email, g.phone, g.country, g.language, g.notes,
                count(b.id) filter (where b.status in ('confirmed', 'checked_in', 'checked_out'))::int as stays,
                max(b.to_date) filter (where b.status in ('confirmed', 'checked_in', 'checked_out')) as last_stay,
                coalesce(sum(p.paid), 0)::numeric(12,2) as total_paid
           from guest g
           join booking b on b.guest_id = g.id and b.property_id = $1
           join v_booking_paid p on p.booking_id = b.id
          where g.anonymized_at is null ${filter}
          group by g.id
          order by max(b.to_date) desc nulls last
          limit 300`,
        params,
        tx,
      );
      return rows.map((g) => ({
        id: g.id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        country: g.country,
        language: g.language,
        notes: g.notes,
        stays: g.stays,
        lastStay: g.last_stay,
        totalPaid: g.total_paid,
        repeat: g.stays > 1,
      }));
    });
  }

  guestDetail(user: SessionUser, guestId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const g = await this.db.one(`select * from guest where id = $1`, [guestId], tx);
      if (!g) throw new NotFoundException('Guest not found');
      const [bookings, codes, reviews] = await Promise.all([
        this.db.query(
          `select b.id, b.reference, b.status, b.from_date, b.to_date, b.total, b.currency, r.name as room_name, p.paid
             from booking b join room r on r.id = b.room_id join v_booking_paid p on p.booking_id = b.id
            where b.guest_id = $1 and b.status <> 'abandoned' order by b.from_date desc`,
          [guestId],
          tx,
        ),
        this.db.query(`select * from discount_code where guest_id = $1 order by created_at desc`, [guestId], tx),
        this.db.query(`select r.*, b.reference from review r join booking b on b.id = r.booking_id where b.guest_id = $1`, [guestId], tx),
      ]);
      return {
        id: g.id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        country: g.country,
        language: g.language,
        notes: g.notes,
        passportLast4: g.passport_last4 ?? null,
        bookings: bookings.map((b) => ({ id: b.id, reference: b.reference, status: b.status, from: b.from_date, to: b.to_date, roomName: b.room_name, total: b.total, paid: b.paid, currency: b.currency })),
        discountCodes: codes.map(toCode),
        reviews: reviews.map(toReview),
      };
    });
  }

  updateGuestNotes(user: SessionUser, guestId: string, notes: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update guest set notes = $2 where id = $1 returning id`, [guestId, notes], tx);
      if (!r) throw new NotFoundException('Guest not found');
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- discount codes
  listCodes(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select c.*, g.name as guest_name from discount_code c left join guest g on g.id = c.guest_id
          where c.property_id = $1 order by c.created_at desc limit 300`,
        [propertyId],
        tx,
      );
      return rows.map(toCode);
    });
  }

  async createCode(user: SessionUser, propertyId: string, input: { code: string; pct: number; expiresAt: string; maxUses: number; guestId: string | null }) {
    try {
      return await this.db.withTenant(user.tenantId, async (tx) => {
        const p = await this.db.one(`select id from property where id = $1`, [propertyId], tx);
        if (!p) throw new NotFoundException('Property not found');
        const row = await this.db.one(
          `insert into discount_code (tenant_id, property_id, code, guest_id, pct, expires_at, max_uses)
           values ($1, $2, $3, $4, $5, $6, $7) returning *`,
          [user.tenantId, propertyId, input.code, input.guestId, input.pct, input.expiresAt, input.maxUses],
          tx,
        );
        return toCode(row!);
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('That code already exists');
      throw err;
    }
  }

  deactivateCode(user: SessionUser, codeId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(`update discount_code set active = false where id = $1 returning id`, [codeId], tx);
      if (!r) throw new NotFoundException('Code not found');
      return { ok: true };
    });
  }

  async publicValidateCode(site: string, code: string) {
    const p = await this.catalog.propertyBySite(site);
    if (!p) throw new NotFoundException('Property not found');
    const c = await this.bookings.validateDiscount(p.id, code);
    return { code: c.code, pct: c.pct };
  }

  // ---------------------------------------------------------------- reviews
  async reviewContext(reference: string, token: string) {
    const b = await this.bookings.findByReference(reference, token);
    const p = (await this.db.one(`select name, google_review_url from property where id = $1`, [b.property_id]))!;
    const existing = await this.db.one(`select * from review where booking_id = $1`, [b.id]);
    return {
      propertyName: p.name,
      guestName: b.guest_name,
      from: b.from_date,
      to: b.to_date,
      canReview: this.reviewable(b),
      /** Reviews open on the check-out day. */
      opensOn: b.to_date,
      review: existing ? { rating: existing.rating, body: existing.body, public: existing.public } : null,
      googleReviewUrl: existing?.public ? p.google_review_url : null,
    };
  }

  /**
   * 4–5 stars: published on the site and the guest is invited to Google. 1–3 stars: kept private
   * and routed to the owner first (spec §3.8).
   */
  async submitReview(reference: string, input: { token: string; rating: number; body: string }) {
    const b = await this.bookings.findByReference(reference, input.token);
    if (!this.reviewable(b)) throw new BadRequestException('Reviews open on your check-out day');
    const isPublic = input.rating >= PUBLIC_REVIEW_MIN_RATING;
    try {
      await this.db.query(
        `insert into review (tenant_id, property_id, booking_id, rating, body, public, guest_name) values ($1, $2, $3, $4, $5, $6, $7)`,
        [b.tenant_id, b.property_id, b.id, input.rating, input.body, isPublic, firstName(b.guest_name)],
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('You already reviewed this stay. Thank you!');
      throw err;
    }
    if (isPublic) this.revalidate.property(b.property_id);
    const p = (await this.db.one(`select google_review_url from property where id = $1`, [b.property_id]))!;
    this.notify.run(
      this.notify.ownerAlert(
        b.property_id,
        isPublic
          ? `New ${input.rating}★ review from ${b.guest_name} (${b.reference}).`
          : `Private feedback (${input.rating}★) from ${b.guest_name} (${b.reference}): "${input.body.slice(0, 200)}". Consider reaching out.`,
        '/reviews',
      ),
    );
    return { public: isPublic, googleReviewUrl: isPublic ? p.google_review_url : null };
  }

  listReviews(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `select r.*, b.reference from review r join booking b on b.id = r.booking_id where r.property_id = $1 order by r.created_at desc limit 300`,
        [propertyId],
        tx,
      );
      return rows.map(toReview);
    });
  }

  replyReview(user: SessionUser, reviewId: string, input: { reply: string; public?: boolean }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const r = await this.db.one(
        `update review set owner_reply = $2, public = coalesce($3, public) where id = $1 returning id, property_id`,
        [reviewId, input.reply, input.public ?? null],
        tx,
      );
      if (!r) throw new NotFoundException('Review not found');
      this.revalidate.property(r.property_id);
      return { ok: true };
    });
  }

  /** Public reviews for the guest site, with the average. */
  async publicReviews(propertyId: string) {
    const rows = await this.db.query(
      `select rating, body, guest_name, owner_reply, created_at from review where property_id = $1 and public order by created_at desc limit 50`,
      [propertyId],
    );
    const stats = await this.db.one<{ avg: number | null; n: number }>(
      `select round(avg(rating)::numeric, 2) as avg, count(*)::int as n from review where property_id = $1 and public`,
      [propertyId],
    );
    return {
      average: stats?.avg ?? null,
      count: stats?.n ?? 0,
      reviews: rows.map((r) => ({ rating: r.rating, body: r.body, guestName: r.guest_name, ownerReply: r.owner_reply, createdAt: r.created_at })),
    };
  }

  private reviewable(b: Row): boolean {
    if (b.status === 'checked_out') return true;
    if (!['confirmed', 'checked_in'].includes(b.status)) return false;
    return b.to_date <= new Date().toISOString().slice(0, 10);
  }
}

function firstName(name: string | null): string {
  if (!name) return 'Guest';
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1]![0]}.` : first!;
}
