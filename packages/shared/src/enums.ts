export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
  'abandoned',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy a night. "free" is the absence of an active row. */
export const ACTIVE_NIGHT_STATUSES = ['held', 'reserved', 'blocked'] as const;
export const NIGHT_STATUSES = [...ACTIVE_NIGHT_STATUSES, 'released'] as const;
export type NightStatus = (typeof NIGHT_STATUSES)[number];

export const NIGHT_SOURCES = ['direct', 'airbnb', 'booking_com', 'agoda', 'vrbo', 'other', 'manual'] as const;
export type NightSource = (typeof NIGHT_SOURCES)[number];

export const ICAL_CHANNELS = ['airbnb', 'booking_com', 'agoda', 'vrbo', 'other'] as const;
export type IcalChannel = (typeof ICAL_CHANNELS)[number];

export const PAYMENT_METHODS = ['payhere', 'lankaqr', 'paypal', 'bank', 'cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'confirmed', 'reversed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CANCELLATION_POLICIES = ['flexible', 'moderate', 'strict'] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const RATE_PLAN_KINDS = ['seasonal', 'weekend', 'long_stay', 'last_minute', 'monthly'] as const;
export type RatePlanKind = (typeof RATE_PLAN_KINDS)[number];

export const BOOKING_MODES = ['instant', 'request'] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export const USER_ROLES = ['owner', 'manager', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROPERTY_TYPES = ['villa', 'guesthouse', 'homestay', 'surf_camp', 'boutique_hotel', 'bungalow'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LANGUAGES = ['en', 'de', 'fr', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const BASE_CURRENCIES = ['USD', 'LKR'] as const;
export type BaseCurrency = (typeof BASE_CURRENCIES)[number];

export const DISPLAY_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'LKR'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const THEMES = ['lagoon', 'jungle', 'surf'] as const;
export type Theme = (typeof THEMES)[number];

/** Fonts the guest site ships (self-hosted with next/font). Theme tokens may only pick from these. */
export const THEME_FONTS = ['cormorant', 'manrope', 'lora', 'work-sans', 'barlow-condensed', 'barlow'] as const;
export type ThemeFont = (typeof THEME_FONTS)[number];

/** OTA commission the owner would have paid; used for "commission saved" (spec §6 v_owner_dashboard). */
export const OTA_COMMISSION_RATE = 0.15;
/** Display-currency buffer over the daily mid rate (spec §4.5). */
export const FX_BUFFER_PCT = 1.5;
export const HOLD_MINUTES = 15;
export const REQUEST_HOLD_HOURS = 12;
export const MAX_ICAL_SOURCES_PER_ROOM = 5;
export const ICAL_FAILURE_ALERT_THRESHOLD = 3;

// ---------------- Release 2
export const SEQUENCE_TRIGGERS = ['booking_confirmed', 'pre_arrival_7d', 'pre_arrival_1d', 'arrival', 'mid_stay', 'check_out'] as const;
export type SequenceTrigger = (typeof SEQUENCE_TRIGGERS)[number];

export const TASK_TYPES = ['clean', 'prepare', 'maintenance', 'shopping'] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'skipped'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STAFF_ROLES = ['cleaner', 'maintenance', 'front_desk'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ADD_ON_CATEGORIES = [
  'airport_pickup',
  'driver',
  'tuk_tuk',
  'surf_lesson',
  'whale_watching',
  'safari',
  'cooking_class',
  'laundry',
  'bicycle',
  'other',
] as const;
export type AddOnCategory = (typeof ADD_ON_CATEGORIES)[number];
export const ADD_ON_ORDER_STATUSES = ['requested', 'confirmed', 'done', 'cancelled'] as const;
export type AddOnOrderStatus = (typeof ADD_ON_ORDER_STATUSES)[number];

export const CONVERSATION_STATUSES = ['open', 'needs_human', 'closed'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** Ratings below this are routed privately to the owner instead of the public review prompt (spec §3.8). */
export const PUBLIC_REVIEW_MIN_RATING = 4;
/** "Book direct next time" code goes out this many days after check-out (11 months, spec §3.8). */
export const REPEAT_GUEST_CODE_AFTER_DAYS = 335;
export const REPEAT_GUEST_CODE_VALID_DAYS = 90;
/** WhatsApp customer-service window. */
export const WHATSAPP_SERVICE_WINDOW_HOURS = 24;

// ---------------- Release 3
export const PLANS = ['basic', 'pro', 'pro_multi', 'manager'] as const;
export type Plan = (typeof PLANS)[number];

/**
 * Spec §8 prices in LKR per month: a flat fee, or a percentage of direct-booking value instead.
 * extraPropertyFee applies to every property from `extraFrom` on (Pro Multi: beyond the first;
 * Manager: every managed property).
 */
export const PLAN_PRICING: Record<Plan, { flat: number; extraPropertyFee: number; extraFrom: number; pct: number; maxProperties: number | null }> = {
  basic: { flat: 5000, extraPropertyFee: 0, extraFrom: 1, pct: 2.5, maxProperties: 1 },
  pro: { flat: 10000, extraPropertyFee: 0, extraFrom: 1, pct: 2.5, maxProperties: 1 },
  pro_multi: { flat: 15000, extraPropertyFee: 5000, extraFrom: 1, pct: 2.0, maxProperties: 5 },
  manager: { flat: 25000, extraPropertyFee: 3000, extraFrom: 0, pct: 1.5, maxProperties: null },
};

/** Monthly platform fee in LKR for a flat plan with this many properties. */
export function flatPlanFee(plan: Plan, properties: number): number {
  const p = PLAN_PRICING[plan];
  return p.flat + p.extraPropertyFee * Math.max(0, properties - p.extraFrom);
}

export const FEATURE_FLAGS = [
  'ai_concierge',
  'housekeeping',
  'add_on_marketplace',
  'guest_crm',
  'long_stay',
  'multi_property',
  'owner_statements',
  'white_label',
  'ota_direct_api',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export const UTILITY_METERS = ['electricity', 'water', 'gas', 'other'] as const;
export const INVITE_ROLES = ['manager', 'staff'] as const;
export const TICKET_STATUSES = ['open', 'pending', 'closed'] as const;
