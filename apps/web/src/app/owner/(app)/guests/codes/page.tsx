import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section } from '@/components/owner/fields';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import type { DiscountCode } from '@/lib/owner-types';
import { createCodeAction, deactivateCodeAction } from '../../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('guests.codesPage.title') };
}

export default async function CodesPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [codes, t] = await Promise.all([ownerApi<DiscountCode[]>(`/properties/${property.id}/discount-codes`), getT()]);
  const inSixMonths = new Date(Date.now() + 182 * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <Link href="/owner/guests" className="text-sm text-brand">
        {t('guests.back')}
      </Link>
      <h1 className="text-2xl font-semibold">{t('guests.codesPage.title')}</h1>

      <Section title={t('guests.codesPage.create')}>
        <ActionForm action={createCodeAction.bind(null, property.id)} submitLabel={t('guests.codesPage.createSubmit')}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={t('guests.codesPage.code')} name="code" required minLength={4} maxLength={24} pattern="[A-Za-z0-9-]+" placeholder="SUMMER10" hint={t('guests.codesPage.codeHint')} />
            <Field label={t('guests.codesPage.pct')} name="pct" type="number" min={1} max={50} step="0.5" required defaultValue={10} />
            <Field label={t('guests.codesPage.validUntil')} name="expiresAt" type="date" required defaultValue={inSixMonths} />
            <Field label={t('guests.codesPage.maxUses')} name="maxUses" type="number" min={1} max={1000} defaultValue={1} />
          </div>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">{t('guests.codesPage.note')}</p>
      </Section>

      <Section title={t('guests.codesPage.list', { n: codes.length })}>
        {codes.length === 0 ? (
          <Empty>{t('guests.codesPage.none')}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {codes.map((c) => {
              const expired = c.expiresAt < new Date().toISOString().slice(0, 10);
              const usedUp = c.uses >= c.maxUses;
              const live = c.active && !expired && !usedUp;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <code className="font-mono text-base font-semibold">{c.code}</code>
                  <span className="text-sm">
                    {t('guests.codeLine', { pct: c.pct, date: t.date(c.expiresAt), uses: c.uses, max: c.maxUses })}
                    {c.reason === 'repeat_guest' && c.guestName ? ` · ${t('guests.codesPage.forGuest', { name: c.guestName })}` : ''}
                  </span>
                  <span className={`pill ${live ? 'bg-ok-bg text-ok' : 'bg-surface-2 text-muted'}`}>
                    {live ? t('guests.codesPage.active') : !c.active ? t('guests.off') : expired ? t('guests.codesPage.expired') : t('guests.codesPage.usedUp')}
                  </span>
                  {c.active && (
                    <span className="ml-auto">
                      <ActionForm action={deactivateCodeAction.bind(null, c.id)} submitLabel={t('guests.codesPage.switchOff')}
                        variant="danger"
                        confirm={t('guests.codesPage.switchOffConfirm', { code: c.code })}
                        inline
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
