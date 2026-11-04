'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/app/owner/actions';

export function LoginForm({ devHint, inviteToken }: { devHint: boolean; inviteToken?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: 'phone' });
  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
      {state.step === 'phone' ? (
        <div>
          <label htmlFor="phone" className="label">
            Mobile number
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="077 123 4567" defaultValue={state.phone} className="field text-lg" />
          <p className="mt-1 text-xs text-muted">We&apos;ll text you a 6-digit code. Sri Lankan numbers can start with 07.</p>
        </div>
      ) : (
        <>
          <input type="hidden" name="phone" value={state.phone} />
          <div>
            <label htmlFor="code" className="label">
              Code sent to {state.phone}
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
            {devHint && <p className="mt-1 text-xs text-muted">Development: the code 123456 always works.</p>}
          </div>
          {!inviteToken && (
            <div>
              <label htmlFor="name" className="label">
                Your name <span className="font-normal text-muted">(first login only)</span>
              </label>
              <input id="name" name="name" autoComplete="name" className="field" />
            </div>
          )}
        </>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? 'Please wait…' : state.step === 'phone' ? 'Send code' : 'Log in'}
      </button>
      {state.step === 'code' && (
        <button type="submit" name="resend" value="1" formNoValidate className="w-full text-sm font-medium text-brand underline-offset-2 hover:underline">
          Send a new code
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
