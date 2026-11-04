import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { addDays, todayIn, type CreateBooking } from '@staydirect/shared';
import { inject } from 'vitest';
import { seed } from '../scripts/seed.js';
import { DbService } from '../src/common/db.service.js';

export interface TestCtx {
  app: INestApplicationContext;
  db: DbService;
  propertyId: string;
  tenantId: string;
  roomIds: string[];
  get<T>(cls: new (...args: any[]) => T): T;
  close(): Promise<void>;
}

export async function setupApp(): Promise<TestCtx> {
  process.env.DATABASE_URL = inject('databaseUrl');
  process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret';
  process.env.SMS_PROVIDER = 'console';
  process.env.PUBLIC_API_URL = 'http://api.test';
  const seeded = await seed(process.env.DATABASE_URL, () => {});
  const { DomainModule } = await import('../src/app.module.js');
  const app = await NestFactory.createApplicationContext(DomainModule, { logger: ['error'] });
  const db = app.get(DbService);
  return {
    app,
    db,
    ...seeded,
    get: (cls) => app.get(cls),
    close: async () => {
      await new Promise((r) => setTimeout(r, 300)); // let fire-and-forget notifications finish
      await app.close();
    },
  };
}

/** A date range far from the seeded bookings, outside high season minimums. */
export function futureStay(offsetDays: number, nights = 3) {
  const from = addDays(todayIn('Asia/Colombo'), offsetDays);
  return { from, to: addDays(from, nights) };
}

let n = 0;
export function bookingInput(roomId: string, from: string, to: string, extra: Partial<CreateBooking> = {}): CreateBooking {
  n++;
  return {
    site: 'villa-lagoon',
    roomId,
    from,
    to,
    guests: 2,
    guest: { name: `Guest ${n}`, email: `guest${n}-${Date.now()}@example.com`, phone: '+447700900123', country: 'GB', language: 'en' },
    specialRequests: '',
    displayCurrency: 'USD',
    acceptPolicy: true,
    ...extra,
  };
}

export async function activeNightsPerDate(db: DbService, roomId: string): Promise<{ date: string; n: number }[]> {
  return db.query(
    `select date, count(*)::int as n from night_inventory
      where room_id = $1 and status in ('held', 'reserved', 'blocked') group by date having count(*) > 1`,
    [roomId],
  ) as Promise<{ date: string; n: number }[]>;
}
