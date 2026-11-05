import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/owner/ActionForm';
import { PaidPill, StatusBadge } from '@/components/owner/BookingList';
import { Stars } from '@/components/Stars';
import { Check, Section, TextArea } from '@/components/owner/fields';
import { ApiError } from '@/lib/api';
import { money, waLink } from '@/lib/format';
import { ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe } from '@/lib/owner-r3';
import { LANGUAGE_LABEL, type GuestDetail } from '@/lib/owner-types';
import { eraseGuestAction, guestNotesAction, keepGuestAction } from '../../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('shared.guest') };
}

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  let g: GuestDetail;
  try {
    g = await ownerApi<GuestDetail>(`/guests/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const wa = waLink(g.phone);
  const isOwner = (await getMe()).user.role === 'owner';

  return (
    <div className="space-y-5">
      <Link href="/owner/guests" className="text-sm text-brand">
        {t('guests.back')}
      </Link>
      <div className="card p-5">
        <h1 className="text-2xl font-semibold">{g.name}</h1>
        <p className="text-muted">{[g.country, LANGUAGE_LABEL[g.language] ?? g.language].filter(Boolean).join(' · ')}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-9 px-4">
              {t('guests.whatsapp', { phone: g.phone ?? '' })}
            </a>
          )}
          {g.email && (
            <a href={`mailto:${g.email}`} className="btn-secondary min-h-9 px-4">
              {g.email}
            </a>
          )}
        </div>
      </div>

      {!g.anonymizedAt && (
        <Section title={t('guests.notes')}>
          <ActionForm action={guestNotesAction.bind(null, g.id)} submitLabel={t('guests.saveNotes')}>
            <TextArea label={t('guests.privateNotes')} name="notes" rows={3} defaultValue={g.notes} hint={t('guests.notesHint')} />
          </ActionForm>
        </Section>
      )}

      <Section title={t('guests.staysTitle', { n: g.bookings.length })}>
        <ul className="divide-y divide-line">
          {g.bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/owner/bookings/${b.id}`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-surface-2/60">
                <span className="flex-1">
                  {t.date(b.from)} → {t.date(b.to)} · {b.roomName} <span className="text-sm text-muted">· {b.reference}</span>
                </span>
                <span className="text-sm">
                  {money(Number(b.paid), b.currency)} / {money(Number(b.total), b.currency)}
                </span>
                <StatusBadge status={b.status} />
                <PaidPill status={b.status} balance={Number(b.total) - Number(b.paid)} paid={Number(b.paid)} currency={b.currency} />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {g.discountCodes.length > 0 && (
        <Section title={t('guests.codes')}>
          <ul className="space-y-2 text-sm">
            {g.discountCodes.map((c) => (
              <li key={c.id} className="flex flex-wrap gap-2">
                <code className="font-mono font-semibold">{c.code}</code> {t('guests.codeLine', { pct: c.pct, date: t.date(c.expiresAt), uses: c.uses, max: c.maxUses })}
                {!c.active && <span className="pill bg-surface-2 text-muted">{t('guests.off')}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {g.reviews.length > 0 && (
        <Section title={t('guests.reviews')}>
          <ul className="space-y-3">
            {g.reviews.map((r) => (
              <li key={r.id}>
                <Stars rating={r.rating} /> <span className="text-sm text-muted">{t.date(r.createdAt)}</span>
                {r.body && <p className="mt-1">{r.body}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="privacy" title={t('guests.privacy.title')}>
        {g.anonymizedAt ? (
          <p className="text-sm text-muted">{t('guests.privacy.erased', { date: t.date(g.anonymizedAt) })}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t('guests.privacy.intro')}</p>
            <ActionForm action={keepGuestAction.bind(null, g.id)} submitLabel={t('guests.privacy.keepSave')} variant="secondary" inline>
              <Check label={t('guests.privacy.keep')} name="keep" defaultChecked={g.keepProfile} />
            </ActionForm>
            <a href={`/owner/export/guest?id=${g.id}`} className="btn-secondary inline-flex min-h-11 items-center px-4" download>
              {t('guests.privacy.download')}
            </a>
            <div className="border-t border-line pt-4">
              <p className="mb-3 text-sm">{t('guests.privacy.eraseIntro')}</p>
              {isOwner ? (
                <ActionForm
                  action={eraseGuestAction.bind(null, g.id)}
                  submitLabel={t('guests.privacy.erase')}
                  variant="danger"
                  confirm={t('guests.privacy.eraseConfirm', { name: g.name })}
                />
              ) : (
                <p className="text-sm text-muted">{t('guests.privacy.eraseOwnerOnly')}</p>
              )}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
