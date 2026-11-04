/**
 * Demo data: one owner (+94770000000, OTP 123456 in dev) with "Villa Lagoon Mirissa", 6 rooms,
 * South-coast seasonal rates, a weekend uplift, long-stay and last-minute discounts, test gateways,
 * and a few bookings so the dashboard is not empty. Idempotent: re-running replaces the demo tenant.
 */
import { addDays, todayIn } from '@staydirect/shared';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { encryptJson } from '../src/common/crypto.js';

export const DEMO_PHONE = '+94770000000';
export const DEMO_SLUG = 'villa-lagoon';

const ROOMS = [
  { name: 'Ocean Suite', maxGuests: 3, baseGuests: 2, beds: '1 king bed + sofa bed', rate: 120, extra: 20, amenities: ['Ocean view', 'Air conditioning', 'Balcony', 'Hot water', 'Wi-Fi 50 Mbps', 'Mini fridge'] },
  { name: 'Garden Double', maxGuests: 2, baseGuests: 2, beds: '1 queen bed', rate: 65, extra: 0, amenities: ['Garden view', 'Air conditioning', 'Hot water', 'Wi-Fi 50 Mbps'] },
  { name: 'Garden Twin', maxGuests: 2, baseGuests: 2, beds: '2 single beds', rate: 60, extra: 0, amenities: ['Garden view', 'Fan', 'Hot water', 'Wi-Fi 50 Mbps'] },
  { name: 'Family Room', maxGuests: 4, baseGuests: 2, beds: '1 king + 2 single beds', rate: 95, extra: 15, amenities: ['Air conditioning', 'Hot water', 'Wi-Fi 50 Mbps', 'Desk', 'Mini fridge'] },
  { name: 'Surfer Bunk', maxGuests: 2, baseGuests: 1, beds: '1 bunk bed', rate: 35, extra: 10, amenities: ['Fan', 'Board rack', 'Shared bathroom', 'Wi-Fi 50 Mbps'] },
  { name: 'Treehouse Loft', maxGuests: 2, baseGuests: 2, beds: '1 queen bed', rate: 85, extra: 0, amenities: ['Jungle view', 'Fan', 'Outdoor shower', 'Wi-Fi 50 Mbps'] },
];

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;
const PHOTOS = [
  photo('photo-1540541338287-41700207dee6'),
  photo('photo-1571896349842-33c89424de2d'),
  photo('photo-1582719508461-905c673771fd'),
  photo('photo-1566073771259-6a8506099945'),
  photo('photo-1520250497591-112f2f40a3f4'),
  photo('photo-1584132967334-10e028bd69f7'),
];

export async function seed(databaseUrl: string, log: (s: string) => void = console.log): Promise<{ propertyId: string; roomIds: string[]; tenantId: string }> {
  const db = new pg.Client({
    connectionString: databaseUrl,
    ssl: /supabase|sslmode=require/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  await db.connect();
  pg.types.setTypeParser(1082, (v) => v);
  try {
    await db.query('begin');
    const old = await db.query(`select tenant_id from app_user where phone = $1`, [DEMO_PHONE]);
    if (old.rows[0]) await wipeTenant(db, old.rows[0].tenant_id);

    const tenant = (await db.query(`insert into tenant (name, plan, billing_status) values ('Nimali Perera', 'pro', 'active') returning id`)).rows[0];
    await db.query(`insert into app_user (tenant_id, phone, email, name, role) values ($1, $2, 'owner@villalagoon.example', 'Nimali Perera', 'owner')`, [tenant.id, DEMO_PHONE]);

    const gateways = encryptJson(
      {
        // PayHere sandbox merchant — replace with the owner's own sandbox/live credentials.
        payhere: { merchantId: '1211149', merchantSecret: 'demo-sandbox-secret-change-me', currency: 'LKR' },
        lankaqr: { qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LANKAQR-DEMO-VILLA-LAGOON', merchantName: 'VILLA LAGOON MIRISSA' },
        bank: { accountName: 'N. Perera', bankName: 'Commercial Bank of Ceylon', accountNumber: '8001234567', branch: 'Matara', swift: 'CCEYLKLX', notes: 'Use your booking reference as the payment description.' },
        cash: true,
      },
      process.env.ENCRYPTION_KEY ?? '',
    );
    const property = (
      await db.query(
        `insert into property (tenant_id, name, slug, type, description, address, area, lat, lng, sltda_number, sltda_expiry,
                               whatsapp_number, email, base_currency, default_deposit_pct, default_cancellation_policy, tax_pct,
                               house_rules, cleaning_buffer_nights, gateway_config, theme, photos, host_name)
         values ($1, 'Villa Lagoon Mirissa', $2, 'villa',
                 'A six-room garden villa five minutes from Mirissa beach. Breakfast with king coconut on the terrace, surf boards to borrow, and a hammock for every afternoon. Whale-watching boats leave from the harbour 1.5 km away.',
                 '12 Bandaramulla Road, Mirissa 81740, Sri Lanka', 'Mirissa', 5.9483, 80.4716, 'SLTDA/SR/GH/1234', '2027-06-30',
                 '+94770000000', 'stay@villalagoon.example', 'USD', 30, 'moderate', 0,
                 'No smoking indoors. Quiet hours 10 pm – 7 am. Please rinse sand off at the outdoor shower.', 0, $3, 'lagoon', $4, 'Nimali')
         returning id`,
        [tenant.id, DEMO_SLUG, gateways, PHOTOS],
      )
    ).rows[0];

    const roomIds: string[] = [];
    for (const [i, r] of ROOMS.entries()) {
      const row = (
        await db.query(
          `insert into room (tenant_id, property_id, name, description, max_guests, base_guests, beds, bathroom, amenities, photos,
                             base_rate, extra_guest_rate, min_nights, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13) returning id`,
          [
            tenant.id,
            property.id,
            r.name,
            `${r.name} — ${r.beds}. ${r.amenities.slice(0, 3).join(', ')}.`,
            r.maxGuests,
            r.baseGuests,
            r.beds,
            r.amenities.includes('Shared bathroom') ? 'Shared' : 'Private',
            r.amenities,
            [PHOTOS[i % PHOTOS.length], PHOTOS[(i + 1) % PHOTOS.length]],
            r.rate,
            r.extra,
            i,
          ],
        )
      ).rows[0];
      roomIds.push(row.id);
    }

    const today = todayIn('Asia/Colombo');
    const year = Number(today.slice(0, 4));
    const plans = [
      // South-coast high seasons (spec §3.1): Dec–Mar and Jul–Aug, +35%, 2-night minimum, 40% deposit.
      ...[year - 1, year, year + 1].flatMap((y) => [
        { name: `High season ${y}/${y + 1}`, kind: 'seasonal', start: `${y}-12-01`, end: `${y + 1}-03-31`, adj: 35, min: 2, dep: 40, priority: 20 },
        { name: `Summer ${y}`, kind: 'seasonal', start: `${y}-07-01`, end: `${y}-08-31`, adj: 20, min: null, dep: null, priority: 20 },
      ]),
      { name: 'Weekend', kind: 'weekend', start: null, end: null, adj: 10, min: null, dep: null, priority: 10, mask: (1 << 5) | (1 << 6) },
      { name: 'Weekly stay −10%', kind: 'long_stay', start: null, end: null, adj: -10, minStay: 7 },
      { name: 'Monthly stay −25%', kind: 'long_stay', start: null, end: null, adj: -25, minStay: 28 },
      { name: 'Last minute −15%', kind: 'last_minute', start: null, end: null, adj: -15, within: 3 },
    ];
    for (const p of plans as any[]) {
      await db.query(
        `insert into rate_plan (tenant_id, property_id, name, kind, start_date, end_date, weekday_mask, adjustment_pct,
                                min_stay_nights, within_days, deposit_pct, min_nights, priority)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [tenant.id, property.id, p.name, p.kind, p.start, p.end, p.mask ?? 127, p.adj, p.minStay ?? null, p.within ?? null, p.dep ?? null, p.min ?? null, p.priority ?? 10],
      );
    }

    // A few bookings around today so the dashboard has arrivals, a balance and occupancy.
    const guests = [
      { name: 'Anna Schmidt', email: 'anna@example.de', phone: '+491701234567', country: 'DE', language: 'de' },
      { name: 'Rahul Mehta', email: 'rahul@example.in', phone: '+919812345678', country: 'IN', language: 'hi' },
      { name: 'Claire Dubois', email: 'claire@example.fr', phone: '+33612345678', country: 'FR', language: 'fr' },
    ];
    const stays = [
      { room: 0, from: today, nights: 3, guest: 0, paidPct: 100, status: 'confirmed' },
      { room: 1, from: addDays(today, -2), nights: 4, guest: 1, paidPct: 30, status: 'checked_in' },
      { room: 3, from: addDays(today, 5), nights: 7, guest: 2, paidPct: 30, status: 'confirmed' },
    ];
    const bookingIds: string[] = [];
    const guestIds: string[] = [];
    for (const [i, s] of stays.entries()) {
      const g = guests[s.guest]!;
      const guest = (
        await db.query(`insert into guest (tenant_id, name, email, phone, country, language, stays_count) values ($1, $2, $3, $4, $5, $6, 1) returning id`, [
          tenant.id, g.name, g.email, g.phone, g.country, g.language,
        ])
      ).rows[0];
      const room = ROOMS[s.room]!;
      const total = room.rate * s.nights;
      const deposit = Math.round(total * 0.3 * 100) / 100;
      const to = addDays(s.from, s.nights);
      const b = (
        await db.query(
          `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, status, source,
                                base_amount, total, currency, deposit_due, balance_due_date, cancellation_policy_snapshot)
           values ($1, $2, $3, $4, $5, $6, $7, 2, $8, 'direct', $9, $9, 'USD', $10, $6, '{"policy":"moderate"}') returning id`,
          [tenant.id, property.id, roomIds[s.room], guest.id, `SD-DEMO${i + 1}`, s.from, to, s.status, total, deposit],
        )
      ).rows[0];
      bookingIds.push(b.id);
      guestIds.push(guest.id);
      await db.query(
        `insert into night_inventory (tenant_id, room_id, date, status, source, booking_id)
         select $1, $2, d::date, 'reserved', 'direct', $3 from generate_series($4::date, $5::date - 1, interval '1 day') d`,
        [tenant.id, roomIds[s.room], b.id, s.from, to],
      );
      const paid = Math.round(total * s.paidPct) / 100;
      await db.query(
        `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, gateway_ref, status, confirmed_by, confirmed_at)
         values ($1, $2, $3, 'USD', $3, $4, $5, 'confirmed', 'seed', now())`,
        [tenant.id, b.id, paid, i === 1 ? 'lankaqr' : 'payhere', `seed-${i}`],
      );
    }
    // An Airbnb reservation and an owner block, as iCal and manual sources.
    await db.query(
      `insert into night_inventory (tenant_id, room_id, date, status, source, external_uid)
       select $1, $2, d::date, 'reserved', 'airbnb', 'demo-airbnb-1' from generate_series($3::date, $3::date + 3, interval '1 day') d`,
      [tenant.id, roomIds[2], addDays(today, 1)],
    );
    await db.query(
      `insert into night_inventory (tenant_id, room_id, date, status, source, note)
       select $1, $2, d::date, 'blocked', 'manual', 'Roof repair' from generate_series($3::date, $3::date + 1, interval '1 day') d`,
      [tenant.id, roomIds[5], addDays(today, 10)],
    );

    await seedRelease2(db, { tenantId: tenant.id, propertyId: property.id, roomIds, bookingIds, guestIds, today });

    await db.query('commit');
    log(`seeded ${DEMO_SLUG}: 6 rooms, ${plans.length} rate plans, 3 bookings. Owner login ${DEMO_PHONE} (dev OTP from OTP_DEV_CODE).`);
    return { propertyId: property.id, roomIds, tenantId: tenant.id };
  } catch (err) {
    await db.query('rollback');
    throw err;
  } finally {
    await db.end();
  }
}

/** Release 2 demo data: house guide, knowledge base, staff and tasks, add-ons, an inbox thread, a code. */
async function seedRelease2(
  db: pg.Client,
  a: { tenantId: string; propertyId: string; roomIds: string[]; bookingIds: string[]; guestIds: string[]; today: string },
) {
  const { tenantId, propertyId, roomIds, bookingIds, guestIds, today } = a;
  const guide = {
    wifiName: 'VillaLagoon-Guest',
    wifiPassword: 'coconut2027',
    arrival: 'Ask the tuk-tuk driver for Bandaramulla Road, opposite the temple. Ring the bell at the blue gate; Nimali or Kamal will meet you.',
    rules: 'No smoking indoors. Quiet hours 10 pm to 7 am. Rinse sand off at the outdoor shower. Switch off the AC when you go out.',
    checkoutNotes: 'Leave the key in the room. Late check-out until 1 pm if nobody arrives that day, just ask.',
    emergency: [
      { label: 'Ambulance (Suwa Seriya)', phone: '1990' },
      { label: 'Police', phone: '119' },
      { label: 'Tourist police', phone: '+94 11 242 1052' },
      { label: 'Host (Nimali)', phone: '+94 77 000 0000' },
    ],
    places: [
      { name: 'Dewmini Roti Shop', kind: 'restaurant', note: 'Rotis and rice and curry, 5 min walk', mapsUrl: null },
      { name: 'Secret Beach', kind: 'beach', note: 'Quiet cove, calm in the morning', mapsUrl: null },
      { name: 'Commercial Bank ATM', kind: 'atm', note: 'Main road, 10 min by tuk-tuk', mapsUrl: null },
      { name: 'Mirissa Pharmacy', kind: 'pharmacy', note: 'Open until 9 pm', mapsUrl: null },
    ],
  };
  await db.query(`update property set google_review_url = 'https://g.page/r/demo-villa-lagoon/review', guide = $2 where id = $1`, [
    propertyId,
    JSON.stringify(guide),
  ]);

  const knowledge: [string, string][] = [
    ['Breakfast', 'Breakfast is included and served 7:30 to 10:00 on the terrace: fruit, eggs, hoppers or toast, Ceylon tea. Vegetarian and vegan on request.'],
    ['Surf boards', 'Guests can borrow two foam boards for free. Hard boards are LKR 1,500 per day from the surf shop next door.'],
    ['Airport transfer', 'Private car from Colombo airport (BIA) costs USD 55 for up to 3 people, about 3 hours via the Southern Expressway. Book it as an add-on or ask the host.'],
    ['Pets', 'Sorry, no pets. Our two cats live in the garden.'],
    ['Laundry', 'Laundry is LKR 800 per kg, ready the next day.'],
  ];
  for (const [title, body] of knowledge) {
    await db.query(`insert into knowledge_entry (tenant_id, property_id, title, body) values ($1, $2, $3, $4)`, [tenantId, propertyId, title, body]);
  }

  const kamala = (
    await db.query(`insert into staff (tenant_id, property_id, name, phone, role) values ($1, $2, 'Kamala', '+94771111111', 'cleaner') returning id`, [tenantId, propertyId])
  ).rows[0];
  await db.query(`insert into staff (tenant_id, property_id, name, phone, role) values ($1, $2, 'Sunil', '+94772222222', 'maintenance')`, [tenantId, propertyId]);
  await db.query(
    `insert into task (tenant_id, property_id, room_id, date, type, title, assignee_staff_id)
     values ($1, $2, $3, $4, 'clean', 'Clean Garden Twin', $5),
            ($1, $2, $6, $4, 'prepare', 'Prepare Ocean Suite for Anna Schmidt (2 guests)', $5),
            ($1, $2, $7, $4, 'maintenance', 'Fix dripping tap in Treehouse Loft', null)`,
    [tenantId, propertyId, roomIds[2], today, kamala.id, roomIds[0], roomIds[5]],
  );

  const providers: [string, string, string[]][] = [
    ['Ruwan Tours', '+94773333333', ['airport_pickup', 'driver', 'safari']],
    ['Mirissa Surf School', '+94774444444', ['surf_lesson']],
    ['Raja and the Whales', '+94775555555', ['whale_watching']],
  ];
  const providerIds: string[] = [];
  for (const [name, phone, types] of providers) {
    providerIds.push((await db.query(`insert into provider (tenant_id, name, phone, service_types) values ($1, $2, $3, $4) returning id`, [tenantId, name, phone, types])).rows[0].id);
  }
  const addOns: [string, string, string, number, string, string | null, number][] = [
    ['Airport pickup (Colombo BIA)', 'Private air-conditioned car, up to 3 people with luggage. About 3 hours.', 'airport_pickup', 55, 'USD', providerIds[0]!, 24],
    ['Surf lesson (2 hours)', 'Beginner lesson with a certified instructor; board and rash guard included.', 'surf_lesson', 25, 'USD', providerIds[1]!, 12],
    ['Whale watching', 'Morning boat from Mirissa harbour with breakfast. Season November to April.', 'whale_watching', 60, 'USD', providerIds[2]!, 24],
    ['Yala safari day trip', 'Jeep, park tickets and driver for a full-day safari in Yala National Park.', 'safari', 140, 'USD', providerIds[0]!, 48],
    ['Laundry (per kg)', 'Washed, dried and folded, back the next day.', 'laundry', 800, 'LKR', null, 0],
  ];
  const addOnIds: string[] = [];
  for (const [i, [name, desc, cat, price, cur, prov, lead]] of addOns.entries()) {
    addOnIds.push(
      (
        await db.query(
          `insert into add_on (tenant_id, property_id, name, description, category, price, currency, provider_id, lead_time_hours, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
          [tenantId, propertyId, name, desc, cat, price, cur, prov, lead, i],
        )
      ).rows[0].id,
    );
  }
  // Anna's stay: a surf lesson tomorrow. USD 25 = provider 19.38 + owner 3.12 (12.5%) + platform 2.50 (10%).
  await db.query(
    `insert into add_on_order (tenant_id, booking_id, add_on_id, provider_id, date, qty, amount, currency, provider_amount, owner_amount, platform_amount, status)
     values ($1, $2, $3, $4, $5, 1, 25, 'USD', 19.38, 3.12, 2.50, 'confirmed')`,
    [tenantId, bookingIds[0], addOnIds[1], providerIds[1], addDays(today, 1)],
  );
  await db.query(`update booking set add_ons_amount = 25, total = total + 25 where id = $1`, [bookingIds[0]]);

  // An escalated WhatsApp thread with Rahul (in-house guest).
  const conv = (
    await db.query(
      `insert into conversation (tenant_id, property_id, guest_id, contact, contact_name, language, status, ai_paused, escalation_summary,
                                 unread_count, last_inbound_at, last_message_at)
       values ($1, $2, $3, '+919812345678', 'Rahul Mehta', 'hi', 'needs_human', true,
               'Rahul asks for a 3 pm late check-out on departure day (evening train).', 1, now() - interval '20 minutes', now() - interval '20 minutes')
       returning id`,
      [tenantId, propertyId, guestIds[1]],
    )
  ).rows[0];
  const thread: [string, string, string, string][] = [
    ['in', 'Hi! What is the Wi-Fi password?', 'guest', '45 minutes'],
    ['out', 'Hi Rahul! Wi-Fi network VillaLagoon-Guest, password coconut2027. Enjoy!', 'ai', '44 minutes'],
    ['in', 'Thanks. Can we check out at 3 pm on our last day? Our train is in the evening.', 'guest', '20 minutes'],
    ['out', 'Let me check with Nimali, she will reply shortly.', 'ai', '19 minutes'],
  ];
  for (const [dir, body, by, ago] of thread) {
    await db.query(
      `insert into message (tenant_id, property_id, guest_id, conversation_id, channel, direction, recipient, body, status, sent_by, ai_generated, created_at)
       values ($1, $2, $3, $4, 'whatsapp', $5, '+919812345678', $6, $7, $8, $9, now() - $10::interval)`,
      [tenantId, propertyId, guestIds[1], conv.id, dir, body, dir === 'in' ? 'received' : 'delivered', by, by === 'ai', ago],
    );
  }
  await db.query(`insert into discount_code (tenant_id, property_id, code, pct, expires_at, max_uses) values ($1, $2, 'WELCOME10', 10, $3, 100)`, [
    tenantId,
    propertyId,
    addDays(today, 180),
  ]);
}

/** Remove a tenant's data in dependency order (demo reset only — money triggers are bypassed by dropping rows as owner). */
async function wipeTenant(db: pg.Client, tenantId: string) {
  await db.query(`alter table payment disable trigger trg_payment_append_only`);
  await db.query(`alter table audit_log disable trigger trg_audit_append_only`);
  for (const t of ['payment', 'night_inventory', 'sync_conflict', 'hold', 'booking_status_log', 'message', 'audit_log', 'add_on_order', 'review',
                   'task', 'task_board_run', 'sequence_send', 'conversation', 'quick_reply', 'knowledge_entry', 'ai_usage', 'sequence']) {
    await db.query(`delete from ${t} where tenant_id = $1`, [tenantId]);
  }
  for (const t of ['booking', 'discount_code', 'guest', 'staff', 'add_on', 'provider', 'ical_source', 'rate_plan', 'room', 'property', 'app_user']) {
    await db.query(`delete from ${t} where tenant_id = $1`, [tenantId]);
  }
  await db.query(`delete from webhook_event where tenant_id = $1`, [tenantId]);
  await db.query(`delete from tenant where id = $1`, [tenantId]);
  await db.query(`alter table payment enable trigger trg_payment_append_only`);
  await db.query(`alter table audit_log enable trigger trg_audit_append_only`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  seed(url).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
