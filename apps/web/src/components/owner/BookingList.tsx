import Link from 'next/link';
import type { OwnerBookingRow } from '@staydirect/shared';
import { money } from '@/lib/format';
import { getT } from '@/lib/owner-i18n';
import { tLabel } from './labels';

export async function StatusBadge({ status }: { status: string }) {
  const t = await getT();
  const tone =
    status === 'confirmed' || status === 'checked_in'
      ? 'bg-ok-bg text-ok'
      : status === 'pending'
        ? 'bg-warn-bg text-warn'
        : status === 'cancelled' || status === 'no_show'
          ? 'bg-bad-bg text-bad'
          : 'bg-surface-2 text-muted';
  return <span className={`pill ${tone}`}>{tLabel(t, 'status', status)}</span>;
}

/** Money state in one glance: green paid, red anything still owed (spec Prompt 5 owner pass). */
export async function PaidPill({ status, balance, paid, currency }: { status: string; balance: number; paid: number; currency: string }) {
  const t = await getT();
  if (status === 'cancelled' || status === 'abandoned') return <span className="pill bg-surface-2 text-muted">{tLabel(t, 'status', status)}</span>;
  if (balance <= 0) return <span className="pill bg-ok-bg text-ok">{t('common.paid')}</span>;
  return <span className="pill bg-bad-bg text-bad">{paid > 0 ? t('common.due', { amount: money(balance, currency) }) : t('common.unpaid')}</span>;
}

/** Compact, tappable booking rows: guest, room, dates, money state. */
export async function BookingList({ rows, empty }: { rows: OwnerBookingRow[]; empty?: string }) {
  const t = await getT();
  if (rows.length === 0) return <p className="py-3 text-sm text-muted">{empty ?? t('shared.nothingHere')}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`/owner/bookings/${b.id}`} className="flex min-h-14 items-center gap-3 py-3 hover:bg-surface-2/60">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {b.guestName ?? tLabel(t, 'source', b.source)}{' '}
                <span className="text-sm font-normal text-muted">· {b.roomName}</span>
              </p>
              <p className="text-sm text-muted">
                {t.short(b.from)} → {t.short(b.to)} · {b.reference}
                {b.mode === 'request' && b.status === 'pending' ? ` · ${t('shared.request')}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-sm font-semibold">{money(b.total, b.currency)}</span>
              <PaidPill status={b.status} balance={b.balance} paid={b.paid} currency={b.currency} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
