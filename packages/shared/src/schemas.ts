import { z } from 'zod';
import { isIsoDate } from './dates.js';
import {
  BASE_CURRENCIES,
  BOOKING_MODES,
  CANCELLATION_POLICIES,
  DISPLAY_CURRENCIES,
  ICAL_CHANNELS,
  LANGUAGES,
  PAYMENT_METHODS,
  PROPERTY_TYPES,
  RATE_PLAN_KINDS,
  THEMES,
} from './enums.js';

export const isoDate = z.string().refine(isIsoDate, 'Expected a date as YYYY-MM-DD');
/** E.164, e.g. +94771234567. Sri Lankan local numbers (07…) are normalised by normalizePhone(). */
export const phone = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Expected an international phone number like +94771234567');
const money = z.coerce.number().min(0).max(10_000_000);
const pct = z.coerce.number().min(-100).max(100);
const slug = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, numbers and dashes');

export function normalizePhone(input: string, defaultCountry = '94'): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+${defaultCountry}${digits.slice(1)}`;
  return `+${digits}`;
}

/**
 * PATCH schema from an upsert schema: every field optional and NO defaults (zod 4 applies
 * defaults inside optional fields, which would silently reset untouched columns).
 */
export function patchOf<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(schema.shape)) {
    const inner = field instanceof z.ZodDefault ? (field.unwrap() as z.ZodType) : (field as z.ZodType);
    shape[key] = inner.optional();
  }
  return z.object(shape) as unknown as z.ZodObject<{ [K in keyof T]: z.ZodOptional<z.ZodType<z.output<T[K]>>> }>;
}

// ---------- auth ----------
export const OtpRequestSchema = z.object({ phone: z.string().min(6).transform((p) => normalizePhone(p)).pipe(phone) });
export const OtpVerifySchema = z.object({
  phone: z.string().min(6).transform((p) => normalizePhone(p)).pipe(phone),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(1).max(120).optional(),
});

// ---------- property setup ----------
export const PropertyUpsertSchema = z.object({
  name: z.string().min(2).max(120),
  slug,
  type: z.enum(PROPERTY_TYPES),
  description: z.string().max(5000).default(''),
  address: z.string().max(300).default(''),
  area: z.string().max(80).default(''),
  lat: z.coerce.number().min(-90).max(90).nullable().default(null),
  lng: z.coerce.number().min(-180).max(180).nullable().default(null),
  sltdaNumber: z.string().max(40).nullable().default(null),
  sltdaExpiry: isoDate.nullable().default(null),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/).default('14:00'),
  checkOut: z.string().regex(/^\d{2}:\d{2}$/).default('11:00'),
  timezone: z.string().default('Asia/Colombo'),
  whatsappNumber: phone.nullable().default(null),
  email: z.string().email().nullable().default(null),
  baseCurrency: z.enum(BASE_CURRENCIES).default('USD'),
  defaultDepositPct: z.coerce.number().min(0).max(100).default(30),
  defaultCancellationPolicy: z.enum(CANCELLATION_POLICIES).default('moderate'),
  taxPct: z.coerce.number().min(0).max(50).default(0),
  houseRules: z.string().max(5000).default(''),
  bookingMode: z.enum(BOOKING_MODES).default('instant'),
  cleaningBufferNights: z.coerce.number().int().min(0).max(3).default(0),
  manualPaymentHoldHours: z.coerce.number().int().min(1).max(72).default(24),
  theme: z.enum(THEMES).default('lagoon'),
  photos: z.array(z.string().url()).max(30).default([]),
  customDomain: z.string().max(253).nullable().default(null),
  hostName: z.string().max(80).default(''),
  hostPhotoUrl: z.string().url().nullable().default(null),
});
export type PropertyUpsert = z.infer<typeof PropertyUpsertSchema>;
export const PropertyPatchSchema = patchOf(PropertyUpsertSchema);

export const RoomUpsertSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(3000).default(''),
  maxGuests: z.coerce.number().int().min(1).max(20),
  baseGuests: z.coerce.number().int().min(1).max(20).default(2),
  beds: z.string().max(120).default(''),
  bathroom: z.string().max(80).default('Private'),
  amenities: z.array(z.string().max(40)).max(40).default([]),
  photos: z.array(z.string().url()).max(30).default([]),
  baseRate: money,
  extraGuestRate: money.default(0),
  minNights: z.coerce.number().int().min(1).max(365).default(1),
  maxNights: z.coerce.number().int().min(1).max(365).nullable().default(null),
  cleaningBufferNights: z.coerce.number().int().min(0).max(3).nullable().default(null),
  bookingMode: z.enum(BOOKING_MODES).nullable().default(null),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});
export type RoomUpsert = z.infer<typeof RoomUpsertSchema>;
export const RoomPatchSchema = patchOf(RoomUpsertSchema);

export const RatePlanUpsertSchema = z
  .object({
    name: z.string().min(1).max(80),
    kind: z.enum(RATE_PLAN_KINDS),
    roomIds: z.array(z.string().uuid()).default([]),
    startDate: isoDate.nullable().default(null),
    endDate: isoDate.nullable().default(null),
    weekdayMask: z.coerce.number().int().min(1).max(127).default(127),
    rate: money.nullable().default(null),
    adjustmentPct: pct.nullable().default(null),
    minStayNights: z.coerce.number().int().min(2).max(365).nullable().default(null),
    withinDays: z.coerce.number().int().min(0).max(60).nullable().default(null),
    depositPct: z.coerce.number().min(0).max(100).nullable().default(null),
    cancellationPolicy: z.enum(CANCELLATION_POLICIES).nullable().default(null),
    minNights: z.coerce.number().int().min(1).max(365).nullable().default(null),
    closedToArrival: z.boolean().default(false),
    closedToDeparture: z.boolean().default(false),
    priority: z.coerce.number().int().min(0).max(100).default(10),
    active: z.boolean().default(true),
  })
  .refine((p) => !(p.startDate && p.endDate) || p.startDate <= p.endDate, 'startDate must be on or before endDate')
  .refine((p) => p.kind !== 'long_stay' || (p.minStayNights != null && p.adjustmentPct != null), {
    message: 'Long-stay plans need minStayNights and adjustmentPct',
  })
  .refine((p) => p.kind !== 'last_minute' || (p.withinDays != null && p.adjustmentPct != null), {
    message: 'Last-minute plans need withinDays and adjustmentPct',
  })
  .refine((p) => !['seasonal', 'weekend'].includes(p.kind) || p.rate != null || p.adjustmentPct != null, {
    message: 'Seasonal and weekend plans need a rate or an adjustmentPct',
  });
export type RatePlanUpsert = z.infer<typeof RatePlanUpsertSchema>;

export const GatewayConfigSchema = z.object({
  payhere: z
    .object({
      merchantId: z.string().min(3),
      merchantSecret: z.string().min(8),
      currency: z.enum(['LKR', 'USD']).default('LKR'),
    })
    .nullable()
    .optional(),
  paypal: z
    .object({
      clientId: z.string().min(10),
      clientSecret: z.string().min(10),
      currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
    })
    .nullable()
    .optional(),
  lankaqr: z
    .object({ qrImageUrl: z.string().url(), merchantName: z.string().min(2) })
    .nullable()
    .optional(),
  bank: z
    .object({
      accountName: z.string().min(2),
      bankName: z.string().min(2),
      accountNumber: z.string().min(4),
      branch: z.string().default(''),
      swift: z.string().default(''),
      notes: z.string().default(''),
    })
    .nullable()
    .optional(),
  cash: z.boolean().optional(),
});
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export const IcalSourceCreateSchema = z.object({
  url: z.string().url().refine((u) => /^https?:\/\//.test(u), 'Must be an http(s) URL'),
  channel: z.enum(ICAL_CHANNELS),
});

export const BlockSchema = z
  .object({ from: isoDate, to: isoDate, note: z.string().max(200).default('') })
  .refine((b) => b.from < b.to, '`to` must be after `from`');

// ---------- guest booking ----------
export const AvailabilityQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
    guests: z.coerce.number().int().min(1).max(20).default(2),
    currency: z.enum(DISPLAY_CURRENCIES).optional(),
  })
  .refine((q) => q.from < q.to, '`to` must be after `from`');
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export const GuestDetailsSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(20).transform((p) => normalizePhone(p)).pipe(phone),
  country: z.string().length(2).toUpperCase(),
  language: z.enum(LANGUAGES).default('en'),
});

export const CreateBookingSchema = z
  .object({
    site: z.string().min(1),
    roomId: z.string().uuid(),
    from: isoDate,
    to: isoDate,
    guests: z.coerce.number().int().min(1).max(20),
    guest: GuestDetailsSchema,
    specialRequests: z.string().max(1000).default(''),
    displayCurrency: z.enum(DISPLAY_CURRENCIES).default('USD'),
    acceptPolicy: z.literal(true),
  })
  .refine((b) => b.from < b.to, '`to` must be after `from`');
export type CreateBooking = z.infer<typeof CreateBookingSchema>;

export const StartPaymentSchema = z.object({
  token: z.string().min(16),
  method: z.enum(PAYMENT_METHODS).exclude(['cash']),
});

export const PaypalCaptureSchema = z.object({ token: z.string().min(16), orderId: z.string().min(5) });

// ---------- owner booking operations ----------
export const RecordPaymentSchema = z.object({
  method: z.enum(['bank', 'lankaqr', 'cash']),
  amount: money.refine((a) => a > 0, 'Amount must be positive'),
  currency: z.string().length(3).optional(),
  reference: z.string().max(120).default(''),
});

export const RefundSchema = z.object({
  amount: money.refine((a) => a > 0, 'Amount must be positive'),
  reason: z.string().min(3).max(300),
});

export const CancelBookingSchema = z.object({
  reason: z.string().min(3).max(300),
  refund: z.boolean().default(true),
});

export const ResolveConflictSchema = z.object({
  resolution: z.enum(['cancel_direct_and_refund', 'asked_ota_to_relocate', 'dismissed']),
  note: z.string().max(300).default(''),
});

export const DateRangeQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.from <= q.to, '`to` must be on or after `from`');
