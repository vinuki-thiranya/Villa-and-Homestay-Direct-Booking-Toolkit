import Link from 'next/link';
import type { ConflictRow } from '@staydirect/shared';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Section } from '@/components/owner/fields';
import { tLabel } from '@/components/owner/labels';
import { Sandakada } from '@/components/owner/motifs';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { resolveConflictAction } from '../../actions';

export default async function ConflictsPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [rows, t] = await Promise.all([ownerApi<ConflictRow[]>(`/properties/${property.id}/conflicts`), getT()]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('conflicts.title')}</h1>
      <p className="text-sm text-muted">{t('conflicts.intro')}</p>
      <Section title={t('conflicts.open', { n: rows.length })}>
        {rows.length === 0 ? (
          <>
            <Sandakada lang={t.lang} className="mx-auto mb-2" />
            <Empty>{t('conflicts.none')}</Empty>
          </>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className="space-y-2 py-4 text-sm">
                <p className="font-medium text-bad">
                  {t('conflicts.booking', { room: c.roomName, date: t.date(c.date), channel: tLabel(t, 'source', c.channel) })} {c.externalUid ? <span className="font-mono text-xs">({c.externalUid.slice(0, 24)})</span> : null}
                </p>
                <p className="text-muted">
                  {t('conflicts.takenBy')}{' '}
                  {c.bookingId ? (
                    <Link href={`/owner/bookings/${c.bookingId}`} className="text-brand underline">
                      {t('conflicts.directBooking', { ref: c.bookingReference ?? '' })}
                    </Link>
                  ) : (
                    t('conflicts.blockOrOther')
                  )}
                  .
                </p>
                <ActionForm action={resolveConflictAction.bind(null, c.id)} submitLabel={t('conflicts.resolve')} variant="secondary" inline>
                  <label htmlFor={`res-${c.id}`} className="sr-only">
                    {t('conflicts.resolution')}
                  </label>
                  <select id={`res-${c.id}`} name="resolution" className="field min-h-9 w-auto text-sm">
                    <option value="asked_ota_to_relocate">{t('conflicts.relocate')}</option>
                    <option value="cancel_direct_and_refund">{t('conflicts.cancelRefund')}</option>
                    <option value="dismissed">{t('conflicts.dismissed')}</option>
                  </select>
                  <input name="note" placeholder={t('conflicts.note')} aria-label={t('conflicts.note')} className="field min-h-9 w-40 text-sm" />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
