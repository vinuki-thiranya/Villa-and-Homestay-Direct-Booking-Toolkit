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

export async function seed(
  databaseUrl: string,
  log: (s: string) => void = console.log,
): Promise<{ propertyId: string; roomIds: string[]; tenantId: string; managerTenantId: string; managerPropertyIds: string[] }> {
  const db = new pg.Client({
    connectionString: databaseUrl,
    ssl: /supabase|sslmode=require/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  await db.connect();
  pg.types.setTypeParser(1082, (v) => v);
  try {
    await db.query('begin');
    const old = await db.query(`select distinct tenant_id from app_user where phone = any($1)`, [[DEMO_PHONE, MANAGER_PHONE, MANAGER_STAFF_PHONE]]);
    for (const r of old.rows) await wipeTenant(db, r.tenant_id);

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
    const r3 = await seedRelease3(db, { tenantId: tenant.id, propertyId: property.id }, today);
    await seedRelease4(db, { tenantId: tenant.id, propertyId: property.id, roomIds }, today);

    await db.query('commit');
    log(`seeded ${DEMO_SLUG}: 6 rooms, ${plans.length} rate plans, 3 bookings. Owner login ${DEMO_PHONE} (dev OTP from OTP_DEV_CODE). Manager company ${MANAGER_PHONE}, limited manager ${MANAGER_STAFF_PHONE}, admin ${ADMIN_PHONE}.`);
    return { propertyId: property.id, roomIds, tenantId: tenant.id, ...r3 };
  } catch (err) {
    await db.query('rollback');
    throw err;
  } finally {
    await db.end();
  }
}

/**
 * Release 4 demo data for the guest site's trust elements: past stays with public reviews, and a few
 * answered WhatsApp questions so "usually replies within…" has data. Review guests have no contact
 * details, so no job ever messages them.
 */
async function seedRelease4(db: pg.Client, villa: { tenantId: string; propertyId: string; roomIds: string[] }, today: string) {
  const reviews: [string, string, number, number, number, string][] = [
    // guest, country, rating, days ago (check-out), room index, review
    ['Sophie L.', 'GB', 5, 32, 0, 'Woke up to the sound of the waves every morning. Nimali arranged a tuk-tuk to the whale watching boat at 6 am and breakfast was waiting when we got back.'],
    ['Jonas K.', 'DE', 5, 58, 3, 'Ruhig, sauber und nur zwei Minuten zum Strand. The hoppers at breakfast are worth the trip alone.'],
    ['Priya S.', 'IN', 4, 85, 1, 'Lovely room with a big shower. Paying by UPI was easy. The road from the main street is a bit narrow for big cars.'],
    ['Camille R.', 'FR', 5, 120, 2, 'Une adresse parfaite pour surfer à Mirissa. Boards to borrow, a kind host, and the garden is full of birds.'],
    ['Tom W.', 'AU', 5, 160, 4, 'Booked direct after finding it on Airbnb and saved a good amount. Same villa, quicker answers on WhatsApp.'],
    ['Aisha M.', 'AE', 4, 210, 5, 'Quiet and green. Ask for the room at the back if you sleep lightly; the front faces the lane.'],
  ];
  for (const [i, [name, country, rating, ago, room, body]] of reviews.entries()) {
    const to = addDays(today, -ago);
    const from = addDays(to, -4);
    const guest = (
      await db.query(`insert into guest (tenant_id, name, country, language, stays_count) values ($1, $2, $3, 'en', 1) returning id`, [villa.tenantId, name, country])
    ).rows[0];
    const b = (
      await db.query(
        `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, status, source,
                              base_amount, total, currency, deposit_due, balance_due_date, cancellation_policy_snapshot)
         values ($1, $2, $3, $4, $5, $6, $7, 2, 'checked_out', 'direct', 480, 480, 'USD', 144, $6, '{"policy":"moderate"}') returning id`,
        [villa.tenantId, villa.propertyId, villa.roomIds[room], guest.id, `SD-PAST${i + 1}`, from, to],
      )
    ).rows[0];
    await db.query(
      `insert into night_inventory (tenant_id, room_id, date, status, source, booking_id)
       select $1, $2, d::date, 'reserved', 'direct', $3 from generate_series($4::date, $5::date - 1, interval '1 day') d`,
      [villa.tenantId, villa.roomIds[room], b.id, from, to],
    );
    await db.query(
      `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, gateway_ref, status, confirmed_by, confirmed_at)
       values ($1, $2, 480, 'USD', 480, 'payhere', $3, 'confirmed', 'seed', $4::date)`,
      [villa.tenantId, b.id, `seed-past-${i}`, from],
    );
    await db.query(
      `insert into review (tenant_id, property_id, booking_id, rating, body, public, guest_name, created_at)
       values ($1, $2, $3, $4, $5, true, $6, $7::date + time '10:00')`,
      [villa.tenantId, villa.propertyId, b.id, rating, body, name, to],
    );
  }

  // Answered questions from people who did not book (no guest record): replies in 12, 25 and 40 minutes.
  for (const [i, minutes] of [12, 25, 40].entries()) {
    const conv = (
      await db.query(
        `insert into conversation (tenant_id, property_id, contact, contact_name, language, status, last_message_at)
         values ($1, $2, $3, 'Enquiry', 'en', 'closed', now() - make_interval(days => $4)) returning id`,
        [villa.tenantId, villa.propertyId, `+4470000000${i}`, 10 + i * 7],
      )
    ).rows[0];
    const asked = `now() - make_interval(days => ${10 + i * 7})`;
    await db.query(
      `insert into message (tenant_id, property_id, conversation_id, channel, direction, body, status, sent_by, created_at)
       values ($1, $2, $3, 'whatsapp', 'in', 'Hi, is the garden room free in March?', 'read', 'guest', ${asked}),
              ($1, $2, $3, 'whatsapp', 'out', 'Hello! Yes, it is free from the 3rd. Shall I send you the booking link?', 'sent', 'user:seed',
               ${asked} + make_interval(mins => $4))`,
      [villa.tenantId, villa.propertyId, conv.id, minutes],
    );
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
const APPEND_ONLY = [
  ['payment', 'trg_payment_append_only'],
  ['audit_log', 'trg_audit_append_only'],
  ['invoice', 'trg_invoice_append_only'],
  ['commission_ledger', 'trg_ledger_append_only'],
  ['owner_statement', 'trg_owner_statement_append_only'],
];

async function wipeTenant(db: pg.Client, tenantId: string) {
  for (const [table, trigger] of APPEND_ONLY) await db.query(`alter table ${table} disable trigger ${trigger}`);
  for (const t of ['payment', 'utility_reading', 'owner_statement', 'commission_ledger', 'channel_ari_queue', 'channel_event', 'channel_connection',
                   'night_inventory', 'sync_conflict', 'hold', 'booking_status_log', 'message', 'audit_log', 'add_on_order', 'review',
                   'task', 'task_board_run', 'sequence_send', 'conversation', 'quick_reply', 'knowledge_entry', 'ai_usage', 'sequence',
                   'invoice', 'invoice_counter', 'user_property', 'invite', 'ticket_message', 'support_ticket', 'feature_flag_override', 'subscription']) {
    await db.query(`delete from ${t} where tenant_id = $1`, [tenantId]);
  }
  for (const t of ['booking', 'discount_code', 'guest', 'staff', 'add_on', 'provider', 'ical_source', 'rate_plan', 'room', 'property',
                   'property_owner', 'app_user']) {
    await db.query(`delete from ${t} where tenant_id = $1`, [tenantId]);
  }
  await db.query(`delete from webhook_event where tenant_id = $1`, [tenantId]);
  await db.query(`delete from tenant where id = $1`, [tenantId]);
  for (const [table, trigger] of APPEND_ONLY) await db.query(`alter table ${table} enable trigger ${trigger}`);
}

export const MANAGER_PHONE = '+94770000001';
export const MANAGER_STAFF_PHONE = '+94770000002';
export const ADMIN_PHONE = '+94770000099';

/**
 * Release 3 demo: a Manager-plan caretaker company with two absent owners and two properties,
 * a manager limited to one property, a simulated OTA connection on Villa Lagoon, and a platform admin.
 */
async function seedRelease3(db: pg.Client, villa: { tenantId: string; propertyId: string }, today: string) {
  await db.query(`insert into subscription (tenant_id, plan, billing_model, status) values ($1, 'pro', 'flat', 'active')`, [villa.tenantId]);
  // Villa Lagoon pays for the direct OTA API (paid extra) and is connected through the simulated partner.
  await db.query(`insert into feature_flag_override (tenant_id, key, enabled, updated_by) values ($1, 'ota_direct_api', true, 'seed')`, [villa.tenantId]);
  const rooms = (await db.query(`select id, name from room where property_id = $1 order by sort_order`, [villa.propertyId])).rows;
  const roomMap = Object.fromEntries(rooms.map((r, i) => [r.id, `R${i + 1}-${String(r.name).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 10)}`]));
  await db.query(
    `insert into channel_connection (tenant_id, property_id, partner, external_property_id, room_map, channels, needs_full_push)
     values ($1, $2, 'simulated', 'SD-villa-lagoon', $3, '{booking_com}', true)`,
    [villa.tenantId, villa.propertyId, JSON.stringify(roomMap)],
  );
  await db.query(
    `insert into rate_plan (tenant_id, property_id, name, kind, monthly_rate, min_stay_nights, utilities, deposit_pct, priority)
     values ($1, $2, 'Nomad month', 'monthly', 1500, 28, 'metered', 30, 30)`,
    [villa.tenantId, villa.propertyId],
  );

  await db.query(`insert into platform_admin (phone, name) values ($1, 'StayDirect Ops') on conflict (phone) do nothing`, [ADMIN_PHONE]);

  const t = (await db.query(`insert into tenant (name, type, plan, billing_status) values ('Southern Coast Caretakers', 'manager_company', 'manager', 'active') returning id`)).rows[0];
  await db.query(`insert into subscription (tenant_id, plan, billing_model, status) values ($1, 'manager', 'flat', 'active')`, [t.id]);
  await db.query(`update tenant set brand = $2 where id = $1`, [
    t.id,
    JSON.stringify({ displayName: 'Southern Coast Stays', logoUrl: null, primaryColor: '#7c2d12', accentColor: '#0e7490', supportEmail: 'hello@southerncoast.example' }),
  ]);
  await db.query(`insert into app_user (tenant_id, phone, name, role) values ($1, $2, 'Dilan Jayasuriya', 'owner')`, [t.id, MANAGER_PHONE]);
  const ayesha = (await db.query(
    `insert into property_owner (tenant_id, name, email, phone, management_fee_pct) values ($1, 'Ayesha Fernando', 'ayesha@example.lk', '+94771234001', 20) returning id`,
    [t.id],
  )).rows[0];
  const webers = (await db.query(
    `insert into property_owner (tenant_id, name, email, phone, management_fee_pct) values ($1, 'Mark and Julia Weber', 'webers@example.de', '+491709990001', 18) returning id`,
    [t.id],
  )).rows[0];
  const homes = [
    { name: 'Tangalle Beach House', slug: 'tangalle-beach-house', owner: ayesha.id, area: 'Tangalle', theme: 'surf', rooms: [['Sea View Room', 95], ['Garden Room', 70], ['Family Suite', 130]] },
    { name: 'Weligama Surf Lodge', slug: 'weligama-surf-lodge', owner: webers.id, area: 'Weligama', theme: 'jungle', rooms: [['Board Room', 45], ['Lodge Double', 60]] },
  ] as const;
  const propertyIds: string[] = [];
  for (const h of homes) {
    const p = (await db.query(
      `insert into property (tenant_id, name, slug, type, description, address, area, base_currency, owner_id, theme, photos, host_name, whatsapp_number)
       values ($1, $2, $3, 'villa', $4, $5, $6, 'USD', $7, $8, '{}', 'Dilan', '+94770000001') returning id`,
      [t.id, h.name, h.slug, `${h.name}, managed by Southern Coast Stays.`, `${h.area}, Southern Province, Sri Lanka`, h.area, h.owner, h.theme],
    )).rows[0];
    propertyIds.push(p.id);
    for (const [i, [name, rate]] of h.rooms.entries()) {
      const room = (await db.query(
        `insert into room (tenant_id, property_id, name, max_guests, base_rate, sort_order) values ($1, $2, $3, 3, $4, $5) returning id`,
        [t.id, p.id, name, rate, i],
      )).rows[0];
      if (i === 0) {
        // A confirmed direct stay this month for the statements, paid in full.
        const g = (await db.query(`insert into guest (tenant_id, name, email, country) values ($1, $2, $3, 'GB') returning id`, [t.id, `Guest of ${h.area}`, `guest.${h.slug}@example.com`])).rows[0];
        const from = `${today.slice(0, 8)}02`;
        const to = `${today.slice(0, 8)}06`;
        const b = (await db.query(
          `insert into booking (tenant_id, property_id, room_id, guest_id, reference, from_date, to_date, guests, status, source, base_amount, total, currency, deposit_due)
           values ($1, $2, $3, $4, $5, $6, $7, 2, 'checked_out', 'direct', $8, $8, 'USD', $8) returning id`,
          [t.id, p.id, room.id, g.id, `SD-MGR${propertyIds.length}`, from, to, Number(rate) * 4],
        )).rows[0];
        await db.query(
          `insert into night_inventory (tenant_id, room_id, date, status, source, booking_id)
           select $1, $2, d::date, 'reserved', 'direct', $3 from generate_series($4::date, $5::date - 1, interval '1 day') d`,
          [t.id, room.id, b.id, from, to],
        );
        await db.query(
          `insert into payment (tenant_id, booking_id, amount, currency, base_amount, method, status, confirmed_by, confirmed_at)
           values ($1, $2, $3, 'USD', $3, 'bank', 'confirmed', 'seed', now())`,
          [t.id, b.id, Number(rate) * 4],
        );
      }
    }
    await db.query(
      `insert into task (tenant_id, property_id, date, type, title, cost, status) values ($1, $2, $3, 'maintenance', 'Pool pump service', 40, 'done')`,
      [t.id, p.id, `${today.slice(0, 8)}03`],
    );
  }
  // Chaminda manages only the Weligama lodge.
  const staff = (await db.query(`insert into app_user (tenant_id, phone, name, role) values ($1, $2, 'Chaminda Silva', 'manager') returning id`, [t.id, MANAGER_STAFF_PHONE])).rows[0];
  await db.query(`insert into user_property (tenant_id, user_id, property_id) values ($1, $2, $3)`, [t.id, staff.id, propertyIds[1]]);
  return { managerTenantId: t.id, managerPropertyIds: propertyIds };
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
