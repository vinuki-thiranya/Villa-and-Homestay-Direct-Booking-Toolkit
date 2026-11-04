import type {
  GatewayConfig,
  PaymentMethod,
  PricingDefaults,
  PricingRatePlan,
  PricingRoom,
  PublicRoom,
} from '@staydirect/shared';
import type { Row } from '../../common/db.service.js';

export function toPricingRoom(r: Row): PricingRoom {
  return {
    id: r.id,
    baseRate: r.base_rate,
    extraGuestRate: r.extra_guest_rate,
    baseGuests: r.base_guests,
    maxGuests: r.max_guests,
    minNights: r.min_nights,
    maxNights: r.max_nights,
  };
}

export function toPricingPlan(p: Row): PricingRatePlan {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    roomIds: p.room_ids ?? [],
    startDate: p.start_date,
    endDate: p.end_date,
    weekdayMask: p.weekday_mask,
    rate: p.rate,
    adjustmentPct: p.adjustment_pct,
    minStayNights: p.min_stay_nights,
    withinDays: p.within_days,
    depositPct: p.deposit_pct,
    cancellationPolicy: p.cancellation_policy,
    minNights: p.min_nights,
    closedToArrival: p.closed_to_arrival,
    closedToDeparture: p.closed_to_departure,
    priority: p.priority,
    active: p.active,
    monthlyRate: p.monthly_rate ?? null,
    utilities: p.utilities ?? null,
  };
}

export function toPricingDefaults(p: Row): PricingDefaults {
  return {
    depositPct: p.default_deposit_pct,
    cancellationPolicy: p.default_cancellation_policy,
    taxPct: p.tax_pct,
  };
}

export function toPublicRoom(r: Row, property: Row): PublicRoom {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    maxGuests: r.max_guests,
    baseGuests: r.base_guests,
    beds: r.beds,
    bathroom: r.bathroom,
    amenities: r.amenities ?? [],
    photos: r.photos ?? [],
    baseRate: r.base_rate,
    minNights: r.min_nights,
    bookingMode: r.booking_mode ?? property.booking_mode,
  };
}

/** Owner-facing camelCase projection of a property row (gateway secrets never included). */
export function toOwnerProperty(p: Row) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    description: p.description,
    address: p.address,
    area: p.area,
    lat: p.lat,
    lng: p.lng,
    sltdaNumber: p.sltda_number,
    sltdaExpiry: p.sltda_expiry,
    checkIn: p.check_in,
    checkOut: p.check_out,
    timezone: p.timezone,
    whatsappNumber: p.whatsapp_number,
    email: p.email,
    baseCurrency: p.base_currency,
    defaultDepositPct: p.default_deposit_pct,
    defaultCancellationPolicy: p.default_cancellation_policy,
    taxPct: p.tax_pct,
    houseRules: p.house_rules,
    bookingMode: p.booking_mode,
    cleaningBufferNights: p.cleaning_buffer_nights,
    manualPaymentHoldHours: p.manual_payment_hold_hours,
    theme: p.theme,
    photos: p.photos,
    customDomain: p.custom_domain,
    hostName: p.host_name,
    hostPhotoUrl: p.host_photo_url,
    published: p.published,
  };
}

export function toOwnerRoom(r: Row) {
  return {
    id: r.id,
    propertyId: r.property_id,
    name: r.name,
    description: r.description,
    maxGuests: r.max_guests,
    baseGuests: r.base_guests,
    beds: r.beds,
    bathroom: r.bathroom,
    amenities: r.amenities,
    photos: r.photos,
    baseRate: r.base_rate,
    extraGuestRate: r.extra_guest_rate,
    minNights: r.min_nights,
    maxNights: r.max_nights,
    cleaningBufferNights: r.cleaning_buffer_nights,
    bookingMode: r.booking_mode,
    sortOrder: r.sort_order,
    active: r.active,
    icalExportToken: r.ical_export_token,
  };
}

export function toOwnerRatePlan(p: Row) {
  return { ...toPricingPlan(p), propertyId: p.property_id };
}

export function enabledMethods(cfg: GatewayConfig | null): PaymentMethod[] {
  if (!cfg) return [];
  const m: PaymentMethod[] = [];
  if (cfg.payhere) m.push('payhere');
  if (cfg.paypal) m.push('paypal');
  if (cfg.lankaqr) m.push('lankaqr');
  if (cfg.bank) m.push('bank');
  return m;
}

/** Column ↔ field maps used to build INSERT/UPDATE statements from validated input. */
export const PROPERTY_COLUMNS: Record<string, string> = {
  name: 'name',
  slug: 'slug',
  type: 'type',
  description: 'description',
  address: 'address',
  area: 'area',
  lat: 'lat',
  lng: 'lng',
  sltdaNumber: 'sltda_number',
  sltdaExpiry: 'sltda_expiry',
  checkIn: 'check_in',
  checkOut: 'check_out',
  timezone: 'timezone',
  whatsappNumber: 'whatsapp_number',
  email: 'email',
  baseCurrency: 'base_currency',
  defaultDepositPct: 'default_deposit_pct',
  defaultCancellationPolicy: 'default_cancellation_policy',
  taxPct: 'tax_pct',
  houseRules: 'house_rules',
  bookingMode: 'booking_mode',
  cleaningBufferNights: 'cleaning_buffer_nights',
  manualPaymentHoldHours: 'manual_payment_hold_hours',
  theme: 'theme',
  photos: 'photos',
  customDomain: 'custom_domain',
  hostName: 'host_name',
  hostPhotoUrl: 'host_photo_url',
};

export const ROOM_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  maxGuests: 'max_guests',
  baseGuests: 'base_guests',
  beds: 'beds',
  bathroom: 'bathroom',
  amenities: 'amenities',
  photos: 'photos',
  baseRate: 'base_rate',
  extraGuestRate: 'extra_guest_rate',
  minNights: 'min_nights',
  maxNights: 'max_nights',
  cleaningBufferNights: 'cleaning_buffer_nights',
  bookingMode: 'booking_mode',
  sortOrder: 'sort_order',
  active: 'active',
};

export const RATE_PLAN_COLUMNS: Record<string, string> = {
  name: 'name',
  kind: 'kind',
  roomIds: 'room_ids',
  startDate: 'start_date',
  endDate: 'end_date',
  weekdayMask: 'weekday_mask',
  rate: 'rate',
  adjustmentPct: 'adjustment_pct',
  minStayNights: 'min_stay_nights',
  withinDays: 'within_days',
  depositPct: 'deposit_pct',
  cancellationPolicy: 'cancellation_policy',
  minNights: 'min_nights',
  closedToArrival: 'closed_to_arrival',
  closedToDeparture: 'closed_to_departure',
  priority: 'priority',
  active: 'active',
  monthlyRate: 'monthly_rate',
  utilities: 'utilities',
};

/** Build "col1, col2" / "$n, $m" / params from an object using a column map. */
export function columnsFor(input: Record<string, unknown>, map: Record<string, string>, startAt = 1) {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [field, col] of Object.entries(map)) {
    if (input[field] === undefined) continue;
    cols.push(col);
    params.push(input[field]);
  }
  const placeholders = params.map((_, i) => `$${i + startAt}`);
  return { cols, params, placeholders, set: cols.map((c, i) => `${c} = ${placeholders[i]}`) };
}
