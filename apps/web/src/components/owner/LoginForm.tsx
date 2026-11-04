'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/owner/actions';
import { useT } from './I18n';

export function LoginForm({ devHint, inviteToken }: { devHint: boolean; inviteToken?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: 'phone' });
  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
      {state.step === 'phone' ? (
        <div>
          <label htmlFor="phone" className="label">
            {t('login.mobile')}
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="077 123 4567" defaultValue={state.phone} className="field text-lg" />
          <p className="mt-1 text-xs text-muted">{t('login.mobileHint')}</p>
        </div>
      ) : (
        <>
          <input type="hidden" name="phone" value={state.phone} />
          <div>
            <label htmlFor="code" className="label">
              {t('login.codeSentTo', { phone: state.phone ?? '' })}
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="field text-center font-mono text-2xl tracking-[0.5em]"
            />
            {devHint && <p className="mt-1 text-xs text-muted">{t('login.devHint')}</p>}
          </div>
          {!inviteToken && (
            <div>
              <label htmlFor="name" className="label">
                {t('login.yourName')} <span className="font-normal text-muted">{t('login.firstLoginOnly')}</span>
              </label>
              <input id="name" name="name" autoComplete="name" className="field" />
            </div>
          )}
        </>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t('login.wait') : state.step === 'phone' ? t('login.sendCode') : t('login.logIn')}
      </button>
      {state.step === 'code' && (
        <button type="submit" name="resend" value="1" formNoValidate className="w-full text-sm font-medium text-brand underline-offset-2 hover:underline">
          {t('login.resend')}
        </button>
      )}
      {state.message && (
        <p role="status" className="text-center text-sm text-muted">
          {state.message}
        </p>
      )}
    </form>
  );
}
