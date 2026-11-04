import Link from 'next/link';
import type { OwnerBookingRow } from '@staydirect/shared';
import { fmtShort, money, SOURCE_LABEL, STATUS_LABEL } from '@/lib/format';

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'confirmed' || status === 'checked_in'
      ? 'bg-ok-bg text-ok'
      : status === 'pending'
        ? 'bg-warn-bg text-warn'
        : status === 'cancelled' || status === 'no_show'
          ? 'bg-bad-bg text-bad'
          : 'bg-surface-2 text-muted';
  return <span className={`pill ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Compact, tappable booking rows: guest, room, dates, money state. */
export function BookingList({ rows, empty = 'Nothing here.' }: { rows: OwnerBookingRow[]; empty?: string }) {
  if (rows.length === 0) return <p className="py-3 text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`/owner/bookings/${b.id}`} className="flex items-center gap-3 py-3 hover:bg-surface-2/60">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {b.guestName ?? SOURCE_LABEL[b.source] ?? 'Guest'} <span className="text-sm font-normal text-muted">· {b.roomName}</span>
              </p>
              <p className="text-sm text-muted">
                {fmtShort(b.from)} → {fmtShort(b.to)} · {b.reference}
                {b.mode === 'request' && b.status === 'pending' ? ' · request' : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-sm font-semibold">{money(b.total, b.currency)}</span>
              <span className={`pill ${b.status === 'cancelled' || b.status === 'abandoned' ? 'bg-surface-2 text-muted' : b.balance <= 0 ? 'bg-ok-bg text-ok' : b.paid > 0 ? 'bg-warn-bg text-warn' : 'bg-bad-bg text-bad'}`}>
                {b.status === 'cancelled' || b.status === 'abandoned'
                  ? STATUS_LABEL[b.status]
                  : b.balance <= 0
                    ? 'Paid'
                    : b.paid > 0
                      ? `Due ${money(b.balance, b.currency)}`
                      : 'Unpaid'}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
