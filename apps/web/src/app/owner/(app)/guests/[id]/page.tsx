import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/owner/ActionForm';
import { StatusBadge } from '@/components/owner/BookingList';
import { Stars } from '@/components/Stars';
import { Section, TextArea } from '@/components/owner/fields';
import { ApiError } from '@/lib/api';
import { fmtDate, money, waLink } from '@/lib/format';
import { ownerApi } from '@/lib/owner';
import { LANGUAGE_LABEL, type GuestDetail } from '@/lib/owner-types';
import { guestNotesAction } from '../../../actions-r2';

export const metadata = { title: 'Guest' };

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let g: GuestDetail;
  try {
    g = await ownerApi<GuestDetail>(`/guests/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const wa = waLink(g.phone);

  return (
    <div className="space-y-5">
      <Link href="/owner/guests" className="text-sm text-brand">
        ← Guests
      </Link>
      <div className="card p-5">
        <h1 className="text-2xl font-semibold">{g.name}</h1>
        <p className="text-muted">{[g.country, LANGUAGE_LABEL[g.language] ?? g.language].filter(Boolean).join(' · ')}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-9 px-4">
              WhatsApp {g.phone}
            </a>
          )}
          {g.email && (
            <a href={`mailto:${g.email}`} className="btn-secondary min-h-9 px-4">
              {g.email}
            </a>
          )}
        </div>
      </div>

      <Section title="Notes">
        <ActionForm action={guestNotesAction.bind(null, g.id)} submitLabel="Save notes">
          <TextArea label="Private notes" name="notes" rows={3} defaultValue={g.notes} hint="Preferences, allergies, how they found you. Only you see this." />
        </ActionForm>
      </Section>

      <Section title={`Stays (${g.bookings.length})`}>
        <ul className="divide-y divide-line">
          {g.bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/owner/bookings/${b.id}`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-surface-2/60">
                <span className="flex-1">
                  {fmtDate(b.from)} → {fmtDate(b.to)} · {b.roomName} <span className="text-sm text-muted">· {b.reference}</span>
                </span>
                <span className="text-sm">
                  {money(Number(b.paid), b.currency)} / {money(Number(b.total), b.currency)}
                </span>
                <StatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {g.discountCodes.length > 0 && (
        <Section title="Discount codes">
          <ul className="space-y-2 text-sm">
            {g.discountCodes.map((c) => (
              <li key={c.id} className="flex flex-wrap gap-2">
                <code className="font-mono font-semibold">{c.code}</code> {c.pct}% · until {fmtDate(c.expiresAt)} · used {c.uses}/{c.maxUses}
                {!c.active && <span className="pill bg-surface-2 text-muted">Off</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {g.reviews.length > 0 && (
        <Section title="Reviews">
          <ul className="space-y-3">
            {g.reviews.map((r) => (
              <li key={r.id}>
                <Stars rating={r.rating} /> <span className="text-sm text-muted">{fmtDate(r.createdAt)}</span>
                {r.body && <p className="mt-1">{r.body}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
