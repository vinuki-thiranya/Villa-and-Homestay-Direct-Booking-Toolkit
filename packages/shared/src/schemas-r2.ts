import { z } from 'zod';
import {
  ADD_ON_CATEGORIES,
  ADD_ON_ORDER_STATUSES,
  CONVERSATION_STATUSES,
  LANGUAGES,
  SEQUENCE_TRIGGERS,
  STAFF_ROLES,
  TASK_STATUSES,
  TASK_TYPES,
} from './enums.js';
import { isoDate, normalizePhone, patchOf, phone } from './schemas.js';

const intlPhone = z.string().min(6).max(20).transform((p) => normalizePhone(p)).pipe(phone);
const money = z.coerce.number().min(0).max(10_000_000);

// ---------- house guide & concierge settings ----------
export const GuideSchema = z.object({
  wifiName: z.string().max(80).default(''),
  wifiPassword: z.string().max(80).default(''),
  arrival: z.string().max(3000).default(''),
  rules: z.string().max(3000).default(''),
  checkoutNotes: z.string().max(2000).default(''),
  emergency: z.array(z.object({ label: z.string().min(1).max(60), phone: z.string().min(3).max(30) })).max(15).default([]),
  places: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        kind: z.enum(['restaurant', 'cafe', 'beach', 'atm', 'pharmacy', 'hospital', 'supermarket', 'sight', 'other']),
        note: z.string().max(300).default(''),
        mapsUrl: z.string().url().nullable().default(null),
      }),
    )
    .max(40)
    .default([]),
});
export type Guide = z.infer<typeof GuideSchema>;

export const ConciergeSettingsSchema = z.object({
  conciergeEnabled: z.boolean().optional(),
  whatsappPhoneNumberId: z.string().max(40).nullable().optional(),
  googleReviewUrl: z.string().url().nullable().optional(),
  repeatGuestDiscountPct: z.coerce.number().min(0).max(50).optional(),
  guide: GuideSchema.optional(),
});

export const KnowledgeEntrySchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(4000),
  language: z.enum(LANGUAGES).default('en'),
});

export const QuickReplySchema = z.object({
  topic: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/),
  language: z.enum(LANGUAGES),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(1500),
  sortOrder: z.coerce.number().int().default(0),
});

// ---------- inbox ----------
export const SendMessageSchema = z.object({ body: z.string().min(1).max(4000) });
export const ConversationUpdateSchema = z.object({
  aiPaused: z.boolean().optional(),
  status: z.enum(CONVERSATION_STATUSES).optional(),
});

export const SequenceUpdateSchema = z.object({
  trigger: z.enum(SEQUENCE_TRIGGERS),
  enabled: z.boolean(),
  channel: z.enum(['auto', 'whatsapp', 'email']).default('auto'),
});

// ---------- housekeeping ----------
export const StaffSchema = z.object({
  name: z.string().min(1).max(80),
  phone: intlPhone.nullable().default(null),
  role: z.enum(STAFF_ROLES).default('cleaner'),
  active: z.boolean().default(true),
});
export const StaffPatchSchema = patchOf(StaffSchema);

export const TaskCreateSchema = z.object({
  date: isoDate,
  type: z.enum(TASK_TYPES),
  title: z.string().min(1).max(160),
  roomId: z.string().uuid().nullable().default(null),
  assigneeStaffId: z.string().uuid().nullable().default(null),
  notes: z.string().max(2000).default(''),
  cost: money.nullable().default(null),
});
export const TaskPatchSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  assigneeStaffId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
  cost: money.nullable().optional(),
  title: z.string().min(1).max(160).optional(),
});

// ---------- add-on marketplace ----------
export const ProviderSchema = z.object({
  name: z.string().min(2).max(80),
  phone: intlPhone,
  serviceTypes: z.array(z.enum(ADD_ON_CATEGORIES)).default([]),
  active: z.boolean().default(true),
});
export const ProviderPatchSchema = patchOf(ProviderSchema);

export const AddOnSchema = z
  .object({
    name: z.string().min(2).max(80),
    description: z.string().max(1000).default(''),
    category: z.enum(ADD_ON_CATEGORIES),
    price: money,
    currency: z.enum(['USD', 'LKR']),
    providerId: z.string().uuid().nullable().default(null),
    commissionPct: z.coerce.number().min(0).max(50).default(12.5),
    platformPct: z.coerce.number().min(0).max(30).default(10),
    leadTimeHours: z.coerce.number().int().min(0).max(720).default(24),
    photoUrl: z.string().url().nullable().default(null),
    active: z.boolean().default(true),
    sortOrder: z.coerce.number().int().default(0),
  })
  .refine((a) => a.commissionPct + a.platformPct <= 60, 'Owner + platform share cannot exceed 60%');
export const AddOnPatchSchema = patchOf(
  z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(1000),
    category: z.enum(ADD_ON_CATEGORIES),
    price: money,
    currency: z.enum(['USD', 'LKR']),
    providerId: z.string().uuid().nullable(),
    commissionPct: z.coerce.number().min(0).max(50),
    platformPct: z.coerce.number().min(0).max(30),
    leadTimeHours: z.coerce.number().int().min(0).max(720),
    photoUrl: z.string().url().nullable(),
    active: z.boolean(),
    sortOrder: z.coerce.number().int(),
  }),
);

export const GuestAddOnOrderSchema = z.object({
  token: z.string().min(16),
  addOnId: z.string().uuid(),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
  qty: z.coerce.number().int().min(1).max(20).default(1),
  notes: z.string().max(500).default(''),
});
export const OwnerAddOnOrderSchema = GuestAddOnOrderSchema.omit({ token: true });
export const AddOnOrderStatusSchema = z.object({ status: z.enum(ADD_ON_ORDER_STATUSES) });

// ---------- reviews & CRM ----------
export const ReviewSubmitSchema = z.object({
  token: z.string().min(16),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(3000).default(''),
});
export const ReviewReplySchema = z.object({ reply: z.string().min(1).max(2000), public: z.boolean().optional() });

export const DiscountCodeSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((c) => c.toUpperCase()),
  pct: z.coerce.number().min(1).max(50),
  expiresAt: isoDate,
  maxUses: z.coerce.number().int().min(1).max(1000).default(1),
  guestId: z.string().uuid().nullable().default(null),
});

export const GuestNotesSchema = z.object({ notes: z.string().max(3000) });

/** Provider job card / cleaner actions from their no-login links. */
export const JobCardActionSchema = z.object({ action: z.enum(['confirm', 'done', 'decline']) });
export const StaffTaskActionSchema = z.object({ status: z.enum(['in_progress', 'done', 'skipped']), notes: z.string().max(1000).optional() });
