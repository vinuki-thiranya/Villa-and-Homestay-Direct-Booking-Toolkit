import Link from 'next/link';
import type { ConflictRow } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Section } from '@/components/owner/fields';
import { fmtDate, SOURCE_LABEL } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import { resolveConflictAction } from '../../actions';

export default async function ConflictsPage() {
  const property = await currentProperty();
  if (!property) return null;
  const rows = await ownerApi<ConflictRow[]>(`/properties/${property.id}/conflicts`);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Double bookings</h1>
      <p className="text-sm text-muted">
        An OTA sold a night that was already taken. Either cancel the direct booking and refund the guest, or ask the OTA to relocate their guest.
        Conflicts close automatically when the OTA removes the night.
      </p>
      <Section title={`Open (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty>No double bookings. 🎉</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className="space-y-2 py-4 text-sm">
                <p className="font-medium text-bad">
                  {c.roomName} · {fmtDate(c.date)} · {SOURCE_LABEL[c.channel]} booking {c.externalUid ? <span className="font-mono text-xs">({c.externalUid.slice(0, 24)})</span> : null}
                </p>
                <p className="text-muted">
                  Already taken by{' '}
                  {c.bookingId ? (
                    <Link href={`/owner/bookings/${c.bookingId}`} className="text-brand underline">
                      direct booking {c.bookingReference}
                    </Link>
                  ) : (
                    'a block or another channel'
                  )}
                  .
                </p>
                <ActionForm action={resolveConflictAction.bind(null, c.id)} submitLabel="Mark resolved" variant="secondary" inline>
                  <label htmlFor={`res-${c.id}`} className="sr-only">
                    Resolution
                  </label>
                  <select id={`res-${c.id}`} name="resolution" className="field min-h-9 w-auto text-sm">
                    <option value="asked_ota_to_relocate">Asked the OTA to relocate their guest</option>
                    <option value="cancel_direct_and_refund">Cancelled the direct booking and refunded</option>
                    <option value="dismissed">Not a real conflict</option>
                  </select>
                  <input name="note" placeholder="Note" aria-label="Note" className="field min-h-9 w-40 text-sm" />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
