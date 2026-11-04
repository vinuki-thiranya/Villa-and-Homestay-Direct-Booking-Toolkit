import { Injectable } from '@nestjs/common';
import {
  addDays,
  convert,
  priceStay,
  todayIn,
  type AvailabilityQuery,
  type AvailabilityResult,
  type RoomAvailability,
  type StayQuote,
} from '@staydirect/shared';
import type pg from 'pg';
import type { Row } from '../../common/db.service.js';
import { FxService } from '../fx/fx.service.js';
import { InventoryService, type OccupiedNight } from '../inventory/inventory.service.js';
import type { PropertyBundle } from '../properties/catalog.service.js';
import { toPricingDefaults, toPricingPlan, toPricingRoom } from '../properties/mappers.js';

const CACHE_TTL_MS = 60_000;
const MAX_BUFFER = 3;

@Injectable()
export class AvailabilityService {
  private cache = new Map<string, { at: number; value: AvailabilityResult }>();

  constructor(
    private readonly inventory: InventoryService,
    private readonly fx: FxService,
  ) {}

  bufferFor(room: Row, property: Row): number {
    return room.cleaning_buffer_nights ?? property.cleaning_buffer_nights ?? 0;
  }

  /** Price one room for a stay (no availability check). */
  quote(bundle: PropertyBundle, room: Row, from: string, to: string, guests: number, promoPct = 0): StayQuote {
    return priceStay({
      room: toPricingRoom(room),
      plans: bundle.plans.map(toPricingPlan),
      defaults: toPricingDefaults(bundle.property),
      from,
      to,
      guests,
      today: todayIn(bundle.property.timezone),
      promoPct,
    });
  }

  /** Is the room free for [from, to) including its cleaning buffer? Reads inside the caller's tx when given. */
  async roomIsFree(bundle: PropertyBundle, room: Row, from: string, to: string, tx?: pg.PoolClient): Promise<boolean> {
    const buffer = this.bufferFor(room, bundle.property);
    const occupied = await this.inventory.occupied([room.id], addDays(from, -buffer), addDays(to, buffer), tx);
    return this.inventory.isFree(occupied, room.id, from, to, buffer);
  }

  async search(bundle: PropertyBundle, q: AvailabilityQuery, promoPct = 0): Promise<AvailabilityResult> {
    const displayCurrency = q.currency ?? bundle.property.base_currency;
    const key = `${bundle.property.id}|${q.from}|${q.to}|${q.guests}|${displayCurrency}|${promoPct}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    const roomIds = bundle.rooms.map((r) => r.id);
    const occupied: OccupiedNight[] = await this.inventory.occupied(
      roomIds,
      addDays(q.from, -MAX_BUFFER),
      addDays(q.to, MAX_BUFFER),
    );
    const fx = await this.fx.table();
    const base = bundle.property.base_currency;

    const rooms: RoomAvailability[] = bundle.rooms.map((room) => {
      const quote = this.quote(bundle, room, q.from, q.to, q.guests, promoPct);
      const free = this.inventory.isFree(occupied, room.id, q.from, q.to, this.bufferFor(room, bundle.property));
      const violations: RoomAvailability['violations'] = [...quote.violations];
      if (!free) violations.push('unavailable');
      return {
        roomId: room.id,
        available: violations.length === 0,
        violations,
        quote,
        display:
          quote.nightCount > 0
            ? {
                currency: displayCurrency,
                total: convert(quote.total, base, displayCurrency, fx),
                deposit: convert(quote.deposit, base, displayCurrency, fx),
                perNight: convert(quote.total / quote.nightCount, base, displayCurrency, fx),
              }
            : null,
      };
    });

    const value: AvailabilityResult = {
      from: q.from,
      to: q.to,
      guests: q.guests,
      baseCurrency: base,
      displayCurrency,
      rooms,
    };
    this.cache.set(key, { at: Date.now(), value });
    if (this.cache.size > 5_000) this.cache.clear();
    return value;
  }

  /** Drop cached searches for a property after any inventory write. */
  invalidate(propertyId: string): void {
    for (const k of this.cache.keys()) if (k.startsWith(`${propertyId}|`)) this.cache.delete(k);
  }
}
