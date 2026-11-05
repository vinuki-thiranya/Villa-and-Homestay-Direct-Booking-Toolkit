import type { PricingRatePlan } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe } from '@/lib/owner-r3';
import { createRatePlanAction, deactivateRatePlanAction } from '../../../actions';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const KINDS = ['seasonal', 'weekend', 'long_stay', 'last_minute', 'monthly'] as const;
const POLICIES = { flexible: 'cancelFlexible', moderate: 'cancelModerate', strict: 'cancelStrict' } as const;

function describe(p: PricingRatePlan, currency: string, t: Translator): string {
  const parts: string[] = [];
  if (p.startDate || p.endDate) parts.push(`${t.date(p.startDate)} – ${t.date(p.endDate)}`);
  if (p.weekdayMask !== 127) parts.push(WEEKDAYS.filter((_, i) => p.weekdayMask & (1 << i)).map((d) => t(`setup.rates.weekdays.${d}`)).join(', '));
  if (p.kind === 'monthly' && p.monthlyRate != null)
    parts.push(
      t('setup.rates.perMonth', {
        amount: money(p.monthlyRate, currency),
        utilities: p.utilities === 'metered' ? t('setup.rates.utilitiesWordMetered') : t('setup.rates.utilitiesWordIncluded'),
      }),
    );
  if (p.rate != null) parts.push(t('setup.rates.perNight', { amount: money(p.rate, currency) }));
  if (p.adjustmentPct != null) parts.push(`${p.adjustmentPct > 0 ? '+' : ''}${p.adjustmentPct}%`);
  if (p.minStayNights) parts.push(t('setup.rates.nightsPlus', { n: p.minStayNights }));
  if (p.withinDays != null) parts.push(t('setup.rates.withinDays', { n: p.withinDays }));
  if (p.minNights) parts.push(t('setup.rates.minNightsShort', { n: p.minNights }));
  if (p.depositPct != null) parts.push(t('setup.rates.depositShort', { n: p.depositPct }));
  if (p.cancellationPolicy) parts.push(t(`setup.rates.${POLICIES[p.cancellationPolicy]}`));
  if (p.closedToArrival) parts.push(t('setup.rates.noArrivalsShort'));
  if (p.closedToDeparture) parts.push(t('setup.rates.noDeparturesShort'));
  return parts.join(', ');
}

export default async function RatesPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [me, t] = await Promise.all([getMe(), getT()]);
  const [plans, rooms] = await Promise.all([
    ownerApi<(PricingRatePlan & { propertyId: string })[]>(`/properties/${property.id}/rate-plans`),
    ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`),
  ]);
  const active = plans.filter((p) => p.active);
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const kindLabel = (k: string) => ((KINDS as readonly string[]).includes(k) ? t(`setup.rates.kind.${k as (typeof KINDS)[number]}`) : k);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('setup.rates.intro')}</p>
      <Section title={t('setup.rates.activeTitle')}>
        {active.length === 0 ? (
          <Empty>{t('setup.rates.empty')}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {active.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.name} <span className="pill bg-surface-2 text-muted">{kindLabel(p.kind)}</span>{' '}
                    <span className="text-xs text-muted">{t('setup.rates.priority', { n: p.priority })}</span>
                  </p>
                  <p className="text-muted">{describe(p, property.baseCurrency, t)}</p>
                  {p.roomIds.length > 0 && (
                    <p className="text-xs text-muted">{t('setup.rates.rooms', { names: p.roomIds.map((id) => roomName.get(id) ?? '?').join(', ') })}</p>
                  )}
                </div>
                <ActionForm
                  action={deactivateRatePlanAction.bind(null, p.id)}
                  submitLabel={t('setup.rates.switchOff')}
                  variant="secondary"
                  inline
                  confirm={t('setup.rates.switchOffConfirm', { name: p.name })}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('setup.rates.addTitle')}>
        <ActionForm action={createRatePlanAction.bind(null, property.id)} submitLabel={t('setup.rates.add')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('setup.rates.name')} name="name" required placeholder={t('setup.rates.namePlaceholder')} />
            <Select
              label={t('setup.rates.type')}
              name="kind"
              options={[
                ['seasonal', t('setup.rates.kindSeasonal')],
                ['weekend', t('setup.rates.kindWeekend')],
                ['long_stay', t('setup.rates.kindLongStay')],
                ['last_minute', t('setup.rates.kindLastMinute')],
                ...(me.flags.long_stay ? ([['monthly', t('setup.rates.kindMonthly')]] as [string, string][]) : []),
              ]}
            />
            <Field label={t('setup.rates.priorityLabel')} name="priority" type="number" min={0} max={100} defaultValue={10} hint={t('setup.rates.priorityHint')} />
          </div>

          <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">{t('setup.rates.price')}</legend>
            <Field
              label={t('setup.rates.nightly', { currency: property.baseCurrency })}
              name="rate"
              type="number"
              min={0}
              step="0.01"
              hint={t('setup.rates.nightlyHint')}
            />
            <Field label={t('setup.rates.changePct')} name="adjustmentPct" type="number" min={-100} max={100} step="0.1" hint={t('setup.rates.changePctHint')} />
            <Field label={t('setup.rates.longFrom')} name="minStayNights" type="number" min={2} hint={t('setup.rates.longFromHint')} />
            <Field label={t('setup.rates.lastWithin')} name="withinDays" type="number" min={0} max={60} hint={t('setup.rates.lastWithinHint')} />
          </fieldset>

          {me.flags.long_stay && (
            <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
              <legend className="px-1 text-sm font-semibold">{t('setup.rates.monthlyTitle')}</legend>
              <Field
                label={t('setup.rates.monthlyPrice', { currency: property.baseCurrency })}
                name="monthlyRate"
                type="number"
                min={0}
                step="0.01"
                hint={t('setup.rates.monthlyPriceHint')}
              />
              <Select
                label={t('setup.rates.utilities')}
                name="utilities"
                options={[
                  ['included', t('setup.rates.utilitiesIncluded')],
                  ['metered', t('setup.rates.utilitiesMetered')],
                ]}
              />
              <Field label={t('setup.rates.fromNights')} name="monthlyMinNights" type="number" min={2} max={365} defaultValue={28} />
            </fieldset>
          )}

          <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">{t('setup.rates.when')}</legend>
            <Field label={t('setup.rates.from')} name="startDate" type="date" />
            <Field label={t('setup.rates.to')} name="endDate" type="date" />
            <div className="sm:col-span-2">
              <p className="label">{t('setup.rates.weekNights')}</p>
              <div className="flex flex-wrap gap-x-3">
                {WEEKDAYS.map((d, i) => (
                  <Check key={d} label={t(`setup.rates.weekdays.${d}`)} name="weekday" value={String(i)} />
                ))}
              </div>
              <p className="text-xs text-muted">{t('setup.rates.weekNightsHint')}</p>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">{t('setup.rates.rules')}</legend>
            <Field label={t('setup.rooms.minNights')} name="minNights" type="number" min={1} />
            <Field label={t('setup.rates.depositPct')} name="depositPct" type="number" min={0} max={100} />
            <Select
              label={t('setup.rates.cancellation')}
              name="cancellationPolicy"
              options={[
                ['', t('setup.rates.cancelDefault')],
                ['flexible', t('setup.rates.cancelFlexible')],
                ['moderate', t('setup.rates.cancelModerate')],
                ['strict', t('setup.rates.cancelStrict')],
              ]}
            />
            <div>
              <Check label={t('setup.rates.noArrivals')} name="closedToArrival" />
              <Check label={t('setup.rates.noDepartures')} name="closedToDeparture" />
            </div>
          </fieldset>

          {rooms.length > 0 && (
            <fieldset className="rounded-xl border border-line p-3">
              <legend className="px-1 text-sm font-semibold">{t('setup.rates.roomsAll')}</legend>
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
