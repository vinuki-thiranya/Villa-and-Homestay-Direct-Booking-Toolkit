'use client';

import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { publicApi } from '@/lib/client-api';
import { fmtDate, formatMoney } from '@/lib/format';

interface GuestInvoice {
  number: string;
  kind: 'booking' | 'long_stay';
  issuedAt: string;
  total: number;
  currency: string;
  pdfUrl: string | null;
}

/** Invoices the host issued for this booking; long stays get the visa-renewal wording up front. */
export function GuestInvoices({ reference, token }: { reference: string; token: string }) {
  const [invoices, setInvoices] = useState<GuestInvoice[]>([]);

  useEffect(() => {
    publicApi<GuestInvoice[]>(`/public/bookings/${encodeURIComponent(reference)}/invoices?t=${encodeURIComponent(token)}`)
      .then(setInvoices)
      .catch(() => setInvoices([]));
  }, [reference, token]);

  if (invoices.length === 0) return null;
  const longStay = invoices.some((i) => i.kind === 'long_stay');

  return (
    <section className="card p-5" aria-labelledby="inv-title">
      <h2 id="inv-title" className="text-lg font-semibold">
        {longStay ? 'Invoice for your visa renewal' : 'Invoices'}
      </h2>
      {longStay && (
        <p className="mt-1 text-sm text-muted">
          These invoices confirm your stay and address, as Sri Lanka immigration asks for when renewing a Digital Nomad Visa.
        </p>
      )}
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
        {invoices.map((i) => (
          <li key={i.number} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <span className="flex-1">
              <span className="font-medium">{i.number}</span> <span className="text-muted">· {fmtDate(i.issuedAt.slice(0, 10))}</span>
            </span>
            <span className="tabular-nums">{formatMoney(i.total, i.currency)}</span>
            {i.pdfUrl && (
              <a href={i.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 px-3" aria-label={`Download invoice ${i.number} as PDF`}>
                <FileDown aria-hidden className="h-4 w-4" /> PDF
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
