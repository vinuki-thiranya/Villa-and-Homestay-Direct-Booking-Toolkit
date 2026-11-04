import { addDays, dayOfWeek, diffDays, nightsBetween, weekdayInMask } from './dates.js';
import type { CancellationPolicy, RatePlanKind } from './enums.js';
import { fromMinor, pctOf, toMinor } from './money.js';

export interface PricingRoom {
  id: string;
  baseRate: number;
  extraGuestRate: number;
  baseGuests: number;
  maxGuests: number;
  minNights: number;
  maxNights: number | null;
}

export interface PricingRatePlan {
  id: string;
  name: string;
  kind: RatePlanKind;
  /** Empty = applies to every room of the property. */
  roomIds: string[];
  startDate: string | null;
  endDate: string | null;
  /** Bit per weekday, 0 = Sunday. */
  weekdayMask: number;
  /** Absolute nightly rate (seasonal/weekend). Takes precedence over adjustmentPct. */
  rate: number | null;
  /** Percentage change, e.g. 20 for +20%, -10 for 10% off. */
  adjustmentPct: number | null;
  /** long_stay: minimum nights for the discount to apply. */
  minStayNights: number | null;
  /** last_minute: arrival within this many days of today. */
  withinDays: number | null;
  depositPct: number | null;
  cancellationPolicy: CancellationPolicy | null;
  minNights: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  priority: number;
  active: boolean;
}

export interface PricingDefaults {
  depositPct: number;
  cancellationPolicy: CancellationPolicy;
  taxPct: number;
}

export interface PriceStayInput {
  room: PricingRoom;
  plans: PricingRatePlan[];
  defaults: PricingDefaults;
  from: string;
  to: string;
  guests: number;
  /** Property-local today, for last-minute discounts. */
  today: string;
}

export type StayViolation =
  | 'invalid_dates'
  | 'min_nights'
  | 'max_nights'
  | 'max_guests'
  | 'closed_to_arrival'
  | 'closed_to_departure'
  | 'in_the_past';

export interface PricedNight {
  date: string;
  rate: number;
  ratePlanId: string | null;
}

export interface StayQuote {
  nights: PricedNight[];
  nightCount: number;
  roomSubtotal: number;
  extraGuestTotal: number;
  discount: number;
  discountPlanId: string | null;
  discountLabel: string | null;
  taxes: number;
  total: number;
  depositPct: number;
  deposit: number;
  cancellationPolicy: CancellationPolicy;
  minNights: number;
  ratePlanId: string | null;
  violations: StayViolation[];
}

function appliesToRoom(plan: PricingRatePlan, roomId: string): boolean {
  return plan.roomIds.length === 0 || plan.roomIds.includes(roomId);
}

function coversDate(plan: PricingRatePlan, date: string): boolean {
  if (plan.startDate && date < plan.startDate) return false;
  if (plan.endDate && date > plan.endDate) return false;
  return true;
}

/**
 * The nightly plan for a date: active seasonal/weekend plans covering the date, weekday and room.
 * Highest priority wins; on a tie the later plan in the list wins (callers pass plans oldest first).
 */
export function nightlyPlanFor(
  plans: PricingRatePlan[],
  roomId: string,
  date: string,
): PricingRatePlan | null {
  const dow = dayOfWeek(date);
  let best: PricingRatePlan | null = null;
  for (const p of plans) {
    if (!p.active || (p.kind !== 'seasonal' && p.kind !== 'weekend')) continue;
    if (!appliesToRoom(p, roomId) || !coversDate(p, date) || !weekdayInMask(p.weekdayMask, dow)) continue;
    if (!best || p.priority >= best.priority) best = p;
  }
  return best;
}

export function priceStay(input: PriceStayInput): StayQuote {
  const { room, plans, defaults, from, to, guests, today } = input;
  const violations: StayViolation[] = [];
  const nightDates = from < to ? nightsBetween(from, to) : [];
  if (nightDates.length === 0) violations.push('invalid_dates');
  if (from < today) violations.push('in_the_past');
  if (guests > room.maxGuests || guests < 1) violations.push('max_guests');

  const extraGuests = Math.max(0, guests - room.baseGuests);
  const baseMinor = toMinor(room.baseRate);
  const extraMinor = toMinor(room.extraGuestRate) * extraGuests;

  const nights: PricedNight[] = [];
  let roomSubtotal = 0;
  for (const date of nightDates) {
    const plan = nightlyPlanFor(plans, room.id, date);
    let rate = baseMinor;
    if (plan?.rate != null) rate = toMinor(plan.rate);
    else if (plan?.adjustmentPct != null) rate = baseMinor + pctOf(baseMinor, plan.adjustmentPct);
    roomSubtotal += rate;
    nights.push({ date, rate: fromMinor(rate), ratePlanId: plan?.id ?? null });
  }
  const extraGuestTotal = extraMinor * nightDates.length;

  // Rules come from the plan governing the arrival night, falling back to property defaults.
  const arrivalPlan = nightDates.length ? nightlyPlanFor(plans, room.id, from) : null;
  const minNights = Math.max(room.minNights, arrivalPlan?.minNights ?? 0);
  if (nightDates.length && nightDates.length < minNights) violations.push('min_nights');
  if (room.maxNights && nightDates.length > room.maxNights) violations.push('max_nights');
  if (arrivalPlan?.closedToArrival) violations.push('closed_to_arrival');
  if (nightDates.length) {
    // closed-to-departure is evaluated on the plan covering the check-out date
    const departurePlan = nightlyPlanFor(plans, room.id, to);
    if (departurePlan?.closedToDeparture) violations.push('closed_to_departure');
  }

  // Stay-level discounts: the single most generous applicable long-stay or last-minute plan.
  const leadDays = diffDays(today, from);
  let discountPlan: PricingRatePlan | null = null;
  for (const p of plans) {
    if (!p.active || p.adjustmentPct == null || !appliesToRoom(p, room.id) || !coversDate(p, from)) continue;
    const eligible =
      (p.kind === 'long_stay' && nightDates.length >= (p.minStayNights ?? Infinity)) ||
      (p.kind === 'last_minute' && leadDays >= 0 && leadDays <= (p.withinDays ?? -1));
    if (!eligible) continue;
    if (!discountPlan || p.adjustmentPct < (discountPlan.adjustmentPct ?? 0)) discountPlan = p;
  }
  const gross = roomSubtotal + extraGuestTotal;
  const discount = discountPlan ? -pctOf(gross, discountPlan.adjustmentPct ?? 0) : 0;
  const net = gross - discount;
  const taxes = pctOf(net, defaults.taxPct);
  const total = net + taxes;
  const depositPct = arrivalPlan?.depositPct ?? defaults.depositPct;

  return {
    nights,
    nightCount: nightDates.length,
    roomSubtotal: fromMinor(roomSubtotal),
    extraGuestTotal: fromMinor(extraGuestTotal),
    discount: fromMinor(discount),
    discountPlanId: discountPlan?.id ?? null,
    discountLabel: discountPlan?.name ?? null,
    taxes: fromMinor(taxes),
    total: fromMinor(total),
    depositPct,
    deposit: fromMinor(pctOf(total, depositPct)),
    cancellationPolicy: arrivalPlan?.cancellationPolicy ?? defaults.cancellationPolicy,
    minNights,
    ratePlanId: arrivalPlan?.id ?? null,
    violations,
  };
}

/** Balance due date: 7 days before arrival, or arrival day for flexible plans (spec §4.4). */
export function balanceDueDate(from: string, policy: CancellationPolicy, today: string): string {
  const due = policy === 'flexible' ? from : addDays(from, -7);
  return due < today ? today : due;
}
