import { FileText } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section, Select } from '@/components/owner/fields';
import { fmtDate, money } from '@/lib/format';
import { ownerApi } from '@/lib/owner';
import type { InvoiceRow, UtilityReading } from '@/lib/owner-r3';
import { addReadingAction, deleteReadingAction, issueInvoiceAction, passportAction } from '@/app/owner/actions-r3';

const METERS: [string, string][] = [
  ['electricity', 'Electricity'],
  ['water', 'Water'],
  ['gas', 'Gas'],
  ['other', 'Other'],
];

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
  const [invoices, readings] = await Promise.all([
    ownerApi<InvoiceRow[]>(`/bookings/${bookingId}/invoices`),
    monthly ? ownerApi<UtilityReading[]>(`/bookings/${bookingId}/utility-readings`) : Promise.resolve([] as UtilityReading[]),
  ]);

  return (
    <>
      <Section title={monthly ? 'Invoices (long stay)' : 'Invoices'}>
        {monthly && (
          <p className="mb-3 text-sm text-muted">
            {monthly.name} · utilities {monthly.utilities}. Long-stay invoices carry the residence wording immigration asks for when guests renew a Digital
            Nomad Visa.
          </p>
        )}
        {invoices.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                <FileText aria-hidden className="h-4 w-4 text-brand" />
                <span className="font-medium">{i.number}</span>
                <span className="flex-1 text-muted">
                  {i.periodStart ? `${fmtDate(i.periodStart)} – ${fmtDate(i.periodEnd)} · ` : ''}
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
            <ActionForm action={issueInvoiceAction.bind(null, bookingId)} submitLabel="Issue invoice" pendingLabel="Issuing…">
              {monthly && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Period from (optional)" name="periodStart" id={`inv-from-${bookingId}`} type="date" min={from} max={to} />
                  <Field label="Period to" name="periodEnd" id={`inv-to-${bookingId}`} type="date" min={from} max={to} hint="Leave both empty to invoice the whole stay" />
                </div>
              )}
            </ActionForm>
          </div>
        )}
      </Section>

      {monthly && (
        <Section title="Utility readings">
          {monthly.utilities === 'included' && <p className="mb-3 text-sm text-muted">Utilities are included in this plan; add readings only for extra charges.</p>}
          {readings.length === 0 ? (
            <Empty>No readings yet. Add the meter readings at the end of each month.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {readings.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium capitalize">{r.meter}</span>{' '}
                    <span className="text-muted">
                      {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)} · {r.startReading} → {r.endReading} × {r.unitRate}
                    </span>
                  </span>
                  <span className="tabular-nums font-medium">{money(r.amount, currency)}</span>
                  {r.invoiceId ? (
                    <span className="pill bg-ok-bg text-ok">Invoiced</span>
                  ) : (
                    <ActionForm action={deleteReadingAction.bind(null, r.id)} submitLabel="Delete" variant="secondary" inline confirm="Delete this reading?" />
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={addReadingAction.bind(null, bookingId)} submitLabel="Add reading">
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Meter" name="meter" id={`m-${bookingId}`} options={METERS} />
                <Field label="From" name="periodStart" id={`ps-${bookingId}`} type="date" required min={from} max={to} defaultValue={from} />
                <Field label="To" name="periodEnd" id={`pe-${bookingId}`} type="date" required min={from} max={to} />
                <Field label="Start reading" name="startReading" id={`sr-${bookingId}`} type="number" min={0} step="0.01" required inputMode="decimal" />
                <Field label="End reading" name="endReading" id={`er-${bookingId}`} type="number" min={0} step="0.01" required inputMode="decimal" />
                <Field label={`Price per unit (${currency})`} name="unitRate" id={`ur-${bookingId}`} type="number" min={0} step="0.0001" required inputMode="decimal" />
              </div>
            </ActionForm>
          </div>
        </Section>
      )}

      {monthly && guest && (
        <Section title="Guest identity for the visa invoice">
          <ActionForm action={passportAction.bind(null, guest.id)} submitLabel="Save" inline>
            <Field
              label="Last 4 characters of the passport number"
              name="passportLast4"
              id={`pp-${bookingId}`}
              defaultValue={guest.passportLast4 ?? ''}
              maxLength={4}
              pattern="[A-Za-z0-9]{4}"
              autoComplete="off"
              hint="We store only these 4 characters (GDPR: minimal data)."
            />
          </ActionForm>
        </Section>
      )}
    </>
  );
}
