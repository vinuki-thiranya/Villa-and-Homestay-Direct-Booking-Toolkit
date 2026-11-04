import { describe, expect, it } from 'vitest';
import { refundDue } from './cancellation.js';
import { convert } from './currency.js';
import { nightsBetween, WEEKEND_MASK } from './dates.js';
import { minorToFixed } from './money.js';
import { balanceDueDate, priceStay, type PricingRatePlan, type PricingRoom } from './pricing.js';

const room: PricingRoom = {
  id: 'r1',
  baseRate: 60,
  extraGuestRate: 10,
  baseGuests: 2,
  maxGuests: 4,
  minNights: 1,
  maxNights: null,
};
const defaults = { depositPct: 30, cancellationPolicy: 'moderate' as const, taxPct: 0 };

function plan(p: Partial<PricingRatePlan> & Pick<PricingRatePlan, 'id' | 'kind'>): PricingRatePlan {
  return {
    name: p.id,
    roomIds: [],
    startDate: null,
    endDate: null,
    weekdayMask: 127,
    rate: null,
    adjustmentPct: null,
    minStayNights: null,
    withinDays: null,
    depositPct: null,
    cancellationPolicy: null,
    minNights: null,
    closedToArrival: false,
    closedToDeparture: false,
    priority: 10,
    active: true,
    ...p,
  };
}

describe('priceStay', () => {
  it('uses the base rate with no plans', () => {
    const q = priceStay({ room, plans: [], defaults, from: '2027-02-01', to: '2027-02-04', guests: 2, today: '2027-01-01' });
    expect(q.nightCount).toBe(3);
    expect(q.total).toBe(180);
    expect(q.deposit).toBe(54);
    expect(q.violations).toEqual([]);
  });

  it('applies seasonal rates per night and the higher-priority weekend plan', () => {
    const plans = [
      plan({ id: 'high', kind: 'seasonal', startDate: '2026-12-01', endDate: '2027-03-31', rate: 90, priority: 10 }),
      plan({ id: 'wknd', kind: 'weekend', weekdayMask: WEEKEND_MASK, adjustmentPct: 20, priority: 20 }),
    ];
    // 2027-01-07 Thu, 08 Fri, 09 Sat → 90, 72, 72
    const q = priceStay({ room, plans, defaults, from: '2027-01-07', to: '2027-01-10', guests: 2, today: '2026-11-01' });
    expect(q.nights.map((n) => n.rate)).toEqual([90, 72, 72]);
    expect(q.total).toBe(234);
  });

  it('charges extra guests and applies the best long-stay discount once', () => {
    const plans = [
      plan({ id: 'ls7', kind: 'long_stay', minStayNights: 7, adjustmentPct: -10 }),
      plan({ id: 'ls28', kind: 'long_stay', minStayNights: 28, adjustmentPct: -25 }),
    ];
    const q = priceStay({ room, plans, defaults, from: '2027-05-01', to: '2027-05-08', guests: 3, today: '2027-01-01' });
    expect(q.extraGuestTotal).toBe(70);
    expect(q.discount).toBe(49); // 10% of (420 + 70)
    expect(q.discountPlanId).toBe('ls7');
    expect(q.total).toBe(441);
  });

  it('applies a discount code after the stay discount', () => {
    const plans = [plan({ id: 'ls7', kind: 'long_stay', minStayNights: 7, adjustmentPct: -10 })];
    const q = priceStay({ room, plans, defaults, from: '2027-05-01', to: '2027-05-08', guests: 2, today: '2027-01-01', promoPct: 10 });
    expect(q.discount).toBe(42); // 10% of 420
    expect(q.promoDiscount).toBe(37.8); // 10% of 378
    expect(q.total).toBe(340.2);
  });

  it('applies last-minute only within the window', () => {
    const plans = [plan({ id: 'lm', kind: 'last_minute', withinDays: 3, adjustmentPct: -15 })];
    const near = priceStay({ room, plans, defaults, from: '2027-01-03', to: '2027-01-05', guests: 2, today: '2027-01-01' });
    const far = priceStay({ room, plans, defaults, from: '2027-01-10', to: '2027-01-12', guests: 2, today: '2027-01-01' });
    expect(near.discount).toBe(18);
    expect(far.discount).toBe(0);
  });

  it('reports min nights, guests, CTA and past dates', () => {
    const plans = [plan({ id: 's', kind: 'seasonal', rate: 80, minNights: 3, closedToArrival: true })];
    const q = priceStay({ room, plans, defaults, from: '2027-01-01', to: '2027-01-02', guests: 5, today: '2027-01-02' });
    expect(q.violations).toEqual(expect.arrayContaining(['min_nights', 'max_guests', 'closed_to_arrival', 'in_the_past']));
  });

  it('takes deposit and policy from the arrival plan and adds taxes', () => {
    const plans = [plan({ id: 's', kind: 'seasonal', rate: 100, depositPct: 50, cancellationPolicy: 'strict' })];
    const q = priceStay({ room, plans, defaults: { ...defaults, taxPct: 10 }, from: '2027-01-01', to: '2027-01-03', guests: 2, today: '2026-12-01' });
    expect(q.taxes).toBe(20);
    expect(q.total).toBe(220);
    expect(q.deposit).toBe(110);
    expect(q.cancellationPolicy).toBe('strict');
  });
});

describe('helpers', () => {
  it('lists nights excluding check-out', () => {
    expect(nightsBetween('2027-02-27', '2027-03-02')).toEqual(['2027-02-27', '2027-02-28', '2027-03-01']);
  });
  it('formats minor units exactly', () => {
    expect(minorToFixed(123456)).toBe('1234.56');
    expect(minorToFixed(5)).toBe('0.05');
    expect(minorToFixed(-250)).toBe('-2.50');
  });
  it('converts with the display buffer', () => {
    expect(convert(100, 'USD', 'LKR', { USD: 1, LKR: 300 })).toBe(30450);
    expect(convert(100, 'USD', 'USD', { USD: 1 })).toBe(100);
  });
  it('computes balance due dates', () => {
    expect(balanceDueDate('2027-02-20', 'moderate', '2027-01-01')).toBe('2027-02-13');
    expect(balanceDueDate('2027-02-20', 'flexible', '2027-01-01')).toBe('2027-02-20');
    expect(balanceDueDate('2027-01-03', 'strict', '2027-01-01')).toBe('2027-01-01');
  });
  it('computes refunds per policy', () => {
    const base = { paid: 100, deposit: 30, arrival: '2027-02-20' };
    expect(refundDue({ ...base, policy: 'flexible', cancelledOn: '2027-02-13' })).toBe(100);
    expect(refundDue({ ...base, policy: 'flexible', cancelledOn: '2027-02-14' })).toBe(0);
    expect(refundDue({ ...base, policy: 'moderate', cancelledOn: '2027-02-06' })).toBe(50);
    expect(refundDue({ ...base, policy: 'strict', cancelledOn: '2027-02-19' })).toBe(70);
  });
});
