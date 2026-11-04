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

export const RATE_PLAN_KINDS = ['seasonal', 'weekend', 'long_stay', 'last_minute'] as const;
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

/** OTA commission the owner would have paid; used for "commission saved" (spec §6 v_owner_dashboard). */
export const OTA_COMMISSION_RATE = 0.15;
/** Display-currency buffer over the daily mid rate (spec §4.5). */
export const FX_BUFFER_PCT = 1.5;
export const HOLD_MINUTES = 15;
export const REQUEST_HOLD_HOURS = 12;
export const MAX_ICAL_SOURCES_PER_ROOM = 5;
export const ICAL_FAILURE_ALERT_THRESHOLD = 3;
