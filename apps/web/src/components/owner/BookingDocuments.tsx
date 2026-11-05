import { FileText } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section, Select } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import type { InvoiceRow, UtilityReading } from '@/lib/owner-r3';
import { addReadingAction, deleteReadingAction, issueInvoiceAction, passportAction } from '@/app/owner/actions-r3';

const METERS = ['electricity', 'water', 'gas', 'other'] as const;

interface Props {
  bookingId: string;
  status: string;
  currency: string;
  from: string;
  to: string;
  monthly: { name: string; utilities: 'included' | 'metered' } | null;
  guest: { id: string; passportLast4: string | null } | null;
}

/**
 * Invoices for a booking and, for long stays, metered utilities and the passport digits that the
 * Digital Nomad Visa invoice prints (spec §3.10).
 */
export async function BookingDocuments({ bookingId, status, currency, from, to, monthly, guest }: Props) {
  const invoiceable = ['confirmed', 'checked_in', 'checked_out'].includes(status);
  const [invoices, readings, t] = await Promise.all([
    ownerApi<InvoiceRow[]>(`/bookings/${bookingId}/invoices`),
    monthly ? ownerApi<UtilityReading[]>(`/bookings/${bookingId}/utility-readings`) : Promise.resolve([] as UtilityReading[]),
    getT(),
  ]);
  const meterLabel = (m: string) => ((METERS as readonly string[]).includes(m) ? t(`documents.meters.${m as (typeof METERS)[number]}`) : m);

  return (
    <>
      <Section title={monthly ? t('documents.invoicesLongStay') : t('documents.invoices')}>
        {monthly && (
          <p className="mb-3 text-sm text-muted">
            {t('documents.longStayNote', {
              plan: monthly.name,
              utilities: monthly.utilities === 'metered' ? t('documents.utilitiesMetered') : t('documents.utilitiesIncluded'),
            })}
          </p>
        )}
        {invoices.length === 0 ? (
          <Empty>{t('documents.empty')}</Empty>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                <FileText aria-hidden className="h-4 w-4 text-brand" />
                <span className="font-medium">{i.number}</span>
                <span className="flex-1 text-muted">
                  {i.periodStart ? `${t.date(i.periodStart)} – ${t.date(i.periodEnd)}, ` : ''}
                  {money(i.total, i.currency)}
                </span>
                {i.pdfUrl && (
                  <a href={i.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-2 hover:underline">
                    PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        {invoiceable && (
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={issueInvoiceAction.bind(null, bookingId)} submitLabel={t('documents.issue')} pendingLabel={t('documents.issuing')}>
              {monthly && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('documents.periodFrom')} name="periodStart" id={`inv-from-${bookingId}`} type="date" min={from} max={to} />
                  <Field
                    label={t('documents.periodTo')}
                    name="periodEnd"
                    id={`inv-to-${bookingId}`}
                    type="date"
                    min={from}
                    max={to}
                    hint={t('documents.periodHint')}
                  />
                </div>
              )}
            </ActionForm>
          </div>
        )}
      </Section>

      {monthly && (
        <Section title={t('documents.readings')}>
          {monthly.utilities === 'included' && <p className="mb-3 text-sm text-muted">{t('documents.includedNote')}</p>}
          {readings.length === 0 ? (
            <Empty>{t('documents.readingsEmpty')}</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {readings.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium capitalize">{meterLabel(r.meter)}</span>{' '}
                    <span className="text-muted">
                      {t.date(r.periodStart)} – {t.date(r.periodEnd)}: {r.startReading} → {r.endReading} × {r.unitRate}
                    </span>
                  </span>
                  <span className="tabular-nums font-medium">{money(r.amount, currency)}</span>
                  {r.invoiceId ? (
                    <span className="pill bg-ok-bg text-ok">{t('documents.invoiced')}</span>
                  ) : (
                    <ActionForm
                      action={deleteReadingAction.bind(null, r.id)}
                      submitLabel={t('common.delete')}
                      variant="secondary"
                      inline
                      confirm={t('documents.deleteReading')}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={addReadingAction.bind(null, bookingId)} submitLabel={t('documents.addReading')}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label={t('documents.meter')} name="meter" id={`m-${bookingId}`} options={METERS.map((m) => [m, meterLabel(m)] as [string, string])} />
                <Field label={t('documents.from')} name="periodStart" id={`ps-${bookingId}`} type="date" required min={from} max={to} defaultValue={from} />
                <Field label={t('documents.to')} name="periodEnd" id={`pe-${bookingId}`} type="date" required min={from} max={to} />
                <Field
                  label={t('documents.startReading')}
                  name="startReading"
                  id={`sr-${bookingId}`}
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  inputMode="decimal"
                />
                <Field label={t('documents.endReading')} name="endReading" id={`er-${bookingId}`} type="number" min={0} step="0.01" required inputMode="decimal" />
                <Field
                  label={t('documents.unitPrice', { currency })}
                  name="unitRate"
                  id={`ur-${bookingId}`}
                  type="number"
                  min={0}
                  step="0.0001"
                  required
                  inputMode="decimal"
                />
              </div>
            </ActionForm>
          </div>
        </Section>
      )}

      {monthly && guest && (
        <Section title={t('documents.identity')}>
          <ActionForm action={passportAction.bind(null, guest.id)} submitLabel={t('common.save')} inline>
            <Field
              label={t('documents.passport')}
              name="passportLast4"
              id={`pp-${bookingId}`}
              defaultValue={guest.passportLast4 ?? ''}
              maxLength={4}
              pattern="[A-Za-z0-9]{4}"
              autoComplete="off"
              hint={t('documents.passportHint')}
            />
          </ActionForm>
        </Section>
      )}
    </>
  );
}
