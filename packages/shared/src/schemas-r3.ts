import { z } from 'zod';
import { FEATURE_FLAGS, INVITE_ROLES, LANGUAGES, PLANS, THEME_FONTS, TICKET_STATUSES, UTILITY_METERS } from './enums.js';
import { isoDate, normalizePhone, phone } from './schemas.js';

const intlPhone = z.string().min(6).max(20).transform((p) => normalizePhone(p)).pipe(phone);
const money = z.coerce.number().min(0).max(100_000_000);
export const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a month as YYYY-MM');

// ---------- team ----------
export const InviteSchema = z.object({
  name: z.string().min(1).max(80),
  phone: intlPhone,
  role: z.enum(INVITE_ROLES),
  propertyIds: z.array(z.string().uuid()).default([]),
});
export const UserAccessSchema = z.object({
  role: z.enum(INVITE_ROLES).optional(),
  propertyIds: z.array(z.string().uuid()).optional(),
});

// ---------- manager companies ----------
export const PayoutDetailsSchema = z.object({
  bankName: z.string().min(2).max(80),
  accountName: z.string().min(2).max(80),
  accountNumber: z.string().min(4).max(40),
  branch: z.string().max(80).default(''),
  swift: z.string().max(20).default(''),
});
export const PropertyOwnerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().nullable().default(null),
  phone: intlPhone.nullable().default(null),
  managementFeePct: z.coerce.number().min(0).max(60).default(20),
  notes: z.string().max(2000).default(''),
  payoutDetails: PayoutDetailsSchema.nullable().optional(),
  active: z.boolean().default(true),
});
export const PropertyOwnerPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: intlPhone.nullable().optional(),
  managementFeePct: z.coerce.number().min(0).max(60).optional(),
  notes: z.string().max(2000).optional(),
  payoutDetails: PayoutDetailsSchema.nullable().optional(),
  active: z.boolean().optional(),
});
export const AssignOwnerSchema = z.object({ ownerId: z.string().uuid().nullable() });
export const StatementQuerySchema = z.object({ period });

// ---------- branding / white label ----------
export const BrandSchema = z.object({
  displayName: z.string().max(80).default(''),
  logoUrl: z.string().url().nullable().default(null),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  supportEmail: z.string().email().nullable().default(null),
});
export type Brand = z.infer<typeof BrandSchema>;

// ---------- long stays ----------
export const UtilityReadingSchema = z
  .object({
    meter: z.enum(UTILITY_METERS),
    periodStart: isoDate,
    periodEnd: isoDate,
    startReading: z.coerce.number().min(0),
    endReading: z.coerce.number().min(0),
    unitRate: z.coerce.number().min(0).max(100_000),
  })
  .refine((r) => r.endReading >= r.startReading, 'The end reading must be at least the start reading')
  .refine((r) => r.periodStart <= r.periodEnd, 'The period must end after it starts');
export const IssueInvoiceSchema = z.object({
  /** long_stay: the month being invoiced; omitted = the whole stay. */
  periodStart: isoDate.optional(),
  periodEnd: isoDate.optional(),
});
export const GuestIdentitySchema = z.object({ passportLast4: z.string().regex(/^[A-Za-z0-9]{4}$/).nullable() });

// ---------- OTA connectivity ----------
export const ChannelConnectSchema = z.object({
  partner: z.enum(['simulated']).default('simulated'),
  externalPropertyId: z.string().min(2).max(80).optional(),
  channels: z.array(z.enum(['booking_com', 'airbnb'])).min(1).default(['booking_com', 'airbnb']),
});
export const SimReservationSchema = z
  .object({
    roomId: z.string().uuid(),
    from: isoDate,
    to: isoDate,
    channel: z.enum(['booking_com', 'airbnb']).default('booking_com'),
    guestName: z.string().min(2).max(120).default('OTA Guest'),
    guestEmail: z.string().email().optional(),
    guests: z.coerce.number().int().min(1).max(20).default(2),
    total: money.default(0),
    currency: z.string().length(3).default('USD'),
  })
  .refine((r) => r.from < r.to, '`to` must be after `from`');

// ---------- provider ratings ----------
export const AddOnRatingSchema = z.object({
  token: z.string().min(16),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).default(''),
});

// ---------- support ----------
export const TicketCreateSchema = z.object({
  subject: z.string().min(3).max(160),
  body: z.string().min(1).max(5000),
  priority: z.enum(['low', 'normal', 'urgent']).default('normal'),
});
export const TicketMessageSchema = z.object({ body: z.string().min(1).max(5000) });
export const TicketStatusSchema = z.object({ status: z.enum(TICKET_STATUSES) });

// ---------- admin console ----------
export const AdminTenantPatchSchema = z.object({
  plan: z.enum(PLANS).optional(),
  billingStatus: z.enum(['trial', 'active', 'grace', 'suspended']).optional(),
  billingModel: z.enum(['flat', 'pct']).optional(),
});
export const FlagDefinitionSchema = z.object({
  description: z.string().min(3).max(200).optional(),
  defaultEnabled: z.boolean().optional(),
  plans: z.array(z.enum(PLANS)).optional(),
});
export const FlagOverrideSchema = z.object({ enabled: z.boolean().nullable() });
export const FlagKeySchema = z.enum(FEATURE_FLAGS);
export const ThemeSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]{2,30}$/),
  name: z.string().min(2).max(60),
  tokens: z.object({
    brand: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    brandStrong: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    surface2: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    radius: z.string().regex(/^\d{1,2}px$/).default('14px'),
    fontDisplay: z.enum(THEME_FONTS).optional(),
    fontSans: z.enum(THEME_FONTS).optional(),
  }),
  published: z.boolean().default(true),
});
export const TranslationSchema = z.object({
  lang: z.enum(LANGUAGES),
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(2000),
});
export const BillingRunSchema = z.object({ period });
export const LedgerPaidSchema = z.object({ note: z.string().max(300).default('') });
