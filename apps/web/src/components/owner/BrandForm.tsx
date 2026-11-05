'use client';

import { useActionState, useState } from 'react';
import type { ActionResult } from '@/app/owner/actions';
import { saveBrandAction } from '@/app/owner/actions-r3';
import type { Brand } from '@/lib/owner-r3';
import { useT } from './I18n';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** White-label brand with a live preview of the guest-site header and footer. */
export function BrandForm({ brand, propertyName }: { brand: Brand; propertyName: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveBrandAction, null);
  const [v, setV] = useState({
    displayName: brand.displayName,
    logoUrl: brand.logoUrl ?? '',
    primaryColor: brand.primaryColor ?? '#0f6e6b',
    accentColor: brand.accentColor ?? '#e8a33d',
    supportEmail: brand.supportEmail ?? '',
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const primary = HEX.test(v.primaryColor) ? v.primaryColor : '#0f6e6b';
  const accent = HEX.test(v.accentColor) ? v.accentColor : '#e8a33d';

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={action} className="space-y-3">
        <div>
          <label htmlFor="b-name" className="label">
            {t('brand.name')}
          </label>
          <input id="b-name" name="displayName" className="field" value={v.displayName} onChange={set('displayName')} placeholder="Southern Coast Stays" />
        </div>
        <div>
          <label htmlFor="b-logo" className="label">
            {t('brand.logo')}
          </label>
          <input id="b-logo" name="logoUrl" type="url" className="field" value={v.logoUrl} onChange={set('logoUrl')} placeholder="https://…/logo.png" />
          <p className="mt-1 text-xs text-muted">{t('brand.logoHint')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['primaryColor', 'accentColor'] as const).map((k) => (
            <div key={k}>
              <label htmlFor={`b-${k}`} className="label">
                {k === 'primaryColor' ? t('brand.mainColour') : t('brand.accentColour')}
              </label>
              <div className="flex items-center gap-2">
                <input aria-label={k === 'primaryColor' ? t('brand.mainPicker') : t('brand.accentPicker')} type="color" value={k === 'primaryColor' ? primary : accent} onChange={set(k)} className="h-11 w-12 cursor-pointer rounded-lg border border-line bg-surface" />
                <input id={`b-${k}`} name={k} className="field font-mono" value={v[k]} onChange={set(k)} pattern="#[0-9a-fA-F]{6}" />
              </div>
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="b-email" className="label">
            {t('brand.supportEmail')}
          </label>
          <input id="b-email" name="supportEmail" type="email" className="field" value={v.supportEmail} onChange={set('supportEmail')} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            {pending ? t('common.saving') : t('brand.save')}
          </button>
          {state?.message && (
            <p role={state.ok ? 'status' : 'alert'} className={`text-sm ${state.ok ? 'text-ok' : 'text-bad'}`}>
              {state.message}
            </p>
          )}
        </div>
      </form>

      {/* A preview of the guest site, which guests see in English: its own words stay English. */}
      <figure aria-label={t('brand.preview')} className="overflow-hidden rounded-card border border-line bg-white text-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <span className="font-display text-base font-semibold">{propertyName}</span>
          <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: primary }} lang="en">
            Book
          </span>
        </div>
        <div className="space-y-2 px-4 py-6">
          <p className="text-sm text-slate-600">{t('brand.previewText')}</p>
          <p className="text-xs text-slate-500">{t('brand.previewNote')}</p>
          <span className="inline-block h-1 w-16 rounded" style={{ background: accent }} />
        </div>
        <figcaption className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          {v.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary owner URL, preview only
            <img src={v.logoUrl} alt="" className="h-5 w-auto" />
          ) : null}
          <span lang="en">
            Managed by <strong>{v.displayName || 'your brand'}</strong>
            {v.supportEmail ? ` · ${v.supportEmail}` : ''}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
