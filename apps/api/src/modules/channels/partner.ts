import { BadRequestException } from '@nestjs/common';
import { nightsBetween } from '@staydirect/shared';
import { randomUUID } from 'node:crypto';
import { DbService } from '../../common/db.service.js';

/** One room-night as the partner sees it. Each room is a single unit: availability 0 or 1. */
export interface AriUpdate {
  roomCode: string;
  date: string;
  availability: number;
  rate: number | null;
  minStay: number | null;
}

export interface BookingRevision {
  revisionId: string;
  reservationId: string;
  status: 'new' | 'modified' | 'cancelled';
  channel: 'booking_com' | 'airbnb';
  roomCode: string;
  from: string;
  to: string;
  guests: number;
  guest: { name: string; email?: string | null; phone?: string | null; country?: string | null };
  total: number;
  currency: string;
}

/**
 * A certified connectivity partner (channel manager) in front of Booking.com and Airbnb.
 * Real partners (e.g. Channex, Rentals United) implement the same three calls; see docs/plan.md §8.
 */
export interface ChannelPartner {
  readonly key: string;
  /** Send availability, rate and min-stay per room-night. Called with batches (≤ ~10k rows). */
  pushAri(externalPropertyId: string, updates: AriUpdate[]): Promise<void>;
  /** Booking revisions not yet acknowledged, oldest first. */
  fetchRevisions(externalPropertyId: string): Promise<BookingRevision[]>;
  /** Acknowledge a revision so the partner stops returning it. */
  ack(externalPropertyId: string, revisionId: string): Promise<void>;
}

/**
 * Plays Booking.com/Airbnb through a channel manager, backed by the sim_partner_* tables so the API,
 * worker and tests share one "OTA". It refuses reservations for nights it was told are unavailable,
 * unless `simulateLag` is set (the race a real OTA can have between our push and its booking).
 */
export class SimulatedPartner implements ChannelPartner {
  readonly key = 'simulated';
  constructor(private readonly db: DbService) {}

  async pushAri(externalPropertyId: string, updates: AriUpdate[]): Promise<void> {
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      await this.db.query(
        `insert into sim_partner_ari (external_property_id, room_code, date, availability, rate, min_stay, updated_at)
         select $1, u.room_code, u.date, u.availability, u.rate, u.min_stay, now()
           from jsonb_to_recordset($2::jsonb) as u(room_code text, date date, availability int, rate numeric, min_stay int)
         on conflict (external_property_id, room_code, date) do update
           set availability = excluded.availability, rate = excluded.rate, min_stay = excluded.min_stay, updated_at = now()`,
        [externalPropertyId, JSON.stringify(chunk.map((u) => ({ room_code: u.roomCode, date: u.date, availability: u.availability, rate: u.rate, min_stay: u.minStay })))],
      );
    }
  }

  async fetchRevisions(externalPropertyId: string): Promise<BookingRevision[]> {
    const rows = await this.db.query(
      `select payload from sim_partner_booking where external_property_id = $1 and acked_at is null order by created_at`,
      [externalPropertyId],
    );
    return rows.map((r) => r.payload as BookingRevision);
  }

  async ack(externalPropertyId: string, revisionId: string): Promise<void> {
    await this.db.query(`update sim_partner_booking set acked_at = now() where external_property_id = $1 and revision_id = $2`, [externalPropertyId, revisionId]);
  }

  // ---------------------------------------------------------------- simulator controls (dev/test)
  async createReservation(
    externalPropertyId: string,
    r: Omit<BookingRevision, 'revisionId' | 'reservationId' | 'status'> & { reservationId?: string },
    opts: { simulateLag?: boolean } = {},
  ): Promise<BookingRevision> {
    if (!opts.simulateLag) {
      const nights = nightsBetween(r.from, r.to);
      const open = await this.db.one<{ n: number }>(
        `select count(*)::int as n from sim_partner_ari where external_property_id = $1 and room_code = $2
            and date = any($3::date[]) and availability > 0`,
        [externalPropertyId, r.roomCode, nights],
      );
      if ((open?.n ?? 0) < nights.length) throw new BadRequestException('Not available on the channel for those dates (the OTA has them closed)');
    }
    const rev: BookingRevision = { ...r, reservationId: r.reservationId ?? `${r.channel === 'airbnb' ? 'HM' : 'BDC'}${randomUUID().slice(0, 8).toUpperCase()}`, revisionId: randomUUID(), status: 'new' };
    await this.db.query(`insert into sim_partner_booking (revision_id, external_property_id, payload) values ($1, $2, $3)`, [rev.revisionId, externalPropertyId, JSON.stringify(rev)]);
    return rev;
  }

  async cancelReservation(externalPropertyId: string, original: BookingRevision): Promise<BookingRevision> {
    const rev: BookingRevision = { ...original, revisionId: randomUUID(), status: 'cancelled' };
    await this.db.query(`insert into sim_partner_booking (revision_id, external_property_id, payload) values ($1, $2, $3)`, [rev.revisionId, externalPropertyId, JSON.stringify(rev)]);
    return rev;
  }

  async state(externalPropertyId: string, from: string, to: string) {
    return this.db.query(
      `select room_code, date, availability, rate, min_stay, updated_at from sim_partner_ari
        where external_property_id = $1 and date >= $2 and date < $3 order by room_code, date`,
      [externalPropertyId, from, to],
    );
  }
}
