import type { PricingRatePlan } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select } from '@/components/owner/fields';
import { fmtDate, money } from '@/lib/format';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { getMe } from '@/lib/owner-r3';
import { createRatePlanAction, deactivateRatePlanAction } from '../../../actions';

const KIND_LABEL: Record<string, string> = {
  seasonal: 'Season',
  weekend: 'Weekday / weekend',
  long_stay: 'Long stay',
  last_minute: 'Last minute',
  monthly: 'Monthly stay',
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function describe(p: PricingRatePlan, currency: string): string {
  const parts: string[] = [];
  if (p.startDate || p.endDate) parts.push(`${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}`);
  if (p.weekdayMask !== 127) parts.push(WEEKDAYS.filter((_, i) => p.weekdayMask & (1 << i)).join(', '));
  if (p.kind === 'monthly' && p.monthlyRate != null) parts.push(`${money(p.monthlyRate, currency)}/month · utilities ${p.utilities ?? 'included'}`);
  if (p.rate != null) parts.push(`${money(p.rate, currency)}/night`);
  if (p.adjustmentPct != null) parts.push(`${p.adjustmentPct > 0 ? '+' : ''}${p.adjustmentPct}%`);
  if (p.minStayNights) parts.push(`${p.minStayNights}+ nights`);
  if (p.withinDays != null) parts.push(`within ${p.withinDays} days of arrival`);
  if (p.minNights) parts.push(`min ${p.minNights} nights`);
  if (p.depositPct != null) parts.push(`${p.depositPct}% deposit`);
  if (p.cancellationPolicy) parts.push(p.cancellationPolicy);
  if (p.closedToArrival) parts.push('no arrivals');
  if (p.closedToDeparture) parts.push('no departures');
  return parts.join(' · ');
}

export default async function RatesPage() {
  const property = await currentProperty();
  if (!property) return null;
  const me = await getMe();
  const [plans, rooms] = await Promise.all([
    ownerApi<(PricingRatePlan & { propertyId: string })[]>(`/properties/${property.id}/rate-plans`),
    ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`),
  ]);
  const active = plans.filter((p) => p.active);
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Each night uses the highest-priority season or weekend plan, otherwise the room&apos;s base rate. Long-stay and last-minute discounts apply once to the whole stay — the most generous one wins.
      </p>
      <Section title="Active rate plans">
        {active.length === 0 ? (
          <Empty>No rate plans — every night uses the room base rate.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {active.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.name} <span className="pill bg-surface-2 text-muted">{KIND_LABEL[p.kind]}</span>{' '}
                    <span className="text-xs text-muted">priority {p.priority}</span>
                  </p>
                  <p className="text-muted">{describe(p, property.baseCurrency)}</p>
                  {p.roomIds.length > 0 && <p className="text-xs text-muted">Rooms: {p.roomIds.map((id) => roomName.get(id) ?? '?').join(', ')}</p>}
                </div>
                <ActionForm action={deactivateRatePlanAction.bind(null, p.id)} submitLabel="Switch off" variant="secondary" inline confirm={`Switch off “${p.name}”?`} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Add a rate plan">
        <ActionForm action={createRatePlanAction.bind(null, property.id)} submitLabel="Add rate plan">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name" name="name" required placeholder="High season 2026/27" />
            <Select
              label="Type"
              name="kind"
              options={[
                ['seasonal', 'Season (dates)'],
                ['weekend', 'Weekday / weekend'],
                ['long_stay', 'Long-stay discount'],
                ['last_minute', 'Last-minute discount'],
                ...(me.flags.long_stay ? ([['monthly', 'Monthly stay (nomads)']] as [string, string][]) : []),
              ]}
            />
            <Field label="Priority" name="priority" type="number" min={0} max={100} defaultValue={10} hint="Higher wins when plans overlap" />
          </div>

          <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">Price</legend>
            <Field label={`Nightly rate (${property.baseCurrency})`} name="rate" type="number" min={0} step="0.01" hint="Season/weekend: fixed price…" />
            <Field label="or change %" name="adjustmentPct" type="number" min={-100} max={100} step="0.1" hint="…or +20 / −10 on the base rate. Discounts: negative %" />
            <Field label="Long stay: from nights" name="minStayNights" type="number" min={2} hint="e.g. 7 or 28" />
            <Field label="Last minute: within days" name="withinDays" type="number" min={0} max={60} hint="e.g. 3" />
          </fieldset>

          {me.flags.long_stay && (
            <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
              <legend className="px-1 text-sm font-semibold">Monthly stay (only for type “Monthly stay”)</legend>
              <Field label={`Price for 30 nights (${property.baseCurrency})`} name="monthlyRate" type="number" min={0} step="0.01" hint="Stays of 28+ nights are priced pro rata" />
              <Select
                label="Utilities"
                name="utilities"
                options={[
                  ['included', 'Included in the price'],
                  ['metered', 'Billed from meter readings'],
                ]}
              />
              <Field label="From nights" name="monthlyMinNights" type="number" min={2} max={365} defaultValue={28} />
            </fieldset>
          )}

          <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">When</legend>
            <Field label="From" name="startDate" type="date" />
            <Field label="To" name="endDate" type="date" />
            <div className="sm:col-span-2">
              <p className="label">Nights of the week</p>
              <div className="flex flex-wrap gap-x-3">
                {WEEKDAYS.map((d, i) => (
                  <Check key={d} label={d} name="weekday" value={String(i)} />
                ))}
              </div>
              <p className="text-xs text-muted">None ticked = every night. Weekend = Fri + Sat.</p>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">Rules (optional)</legend>
            <Field label="Min nights" name="minNights" type="number" min={1} />
            <Field label="Deposit %" name="depositPct" type="number" min={0} max={100} />
            <Select
              label="Cancellation"
              name="cancellationPolicy"
              options={[
                ['', 'Property default'],
                ['flexible', 'Flexible'],
                ['moderate', 'Moderate'],
                ['strict', 'Strict'],
              ]}
            />
            <div>
              <Check label="No arrivals" name="closedToArrival" />
              <Check label="No departures" name="closedToDeparture" />
            </div>
          </fieldset>

          {rooms.length > 0 && (
            <fieldset className="rounded-xl border border-line p-3">
              <legend className="px-1 text-sm font-semibold">Rooms (none ticked = all rooms)</legend>
              <div className="flex flex-wrap gap-x-4">
                {rooms.map((r) => (
                  <Check key={r.id} label={r.name} name="roomIds" value={r.id} />
                ))}
              </div>
            </fieldset>
          )}
        </ActionForm>
      </Section>
    </div>
  );
}
