'use client';

import { useActionState } from 'react';
import { adminLoginAction, type AdminLoginState } from '@/app/admin/actions';

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminLoginAction, { step: 'phone' });
  const codeStep = state.step === 'code';
  return (
    <form action={action} className="space-y-3" noValidate>
      <label className="adm-field">
        <span>Mobile number</span>
        <input
          className="adm-input"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          defaultValue={state.phone}
          readOnly={codeStep}
          placeholder="077 123 4567"
        />
      </label>
      {codeStep && (
        <label className="adm-field">
          <span>6-digit code</span>
          <input className="adm-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus />
        </label>
      )}
      {state.message && (
        <p className="adm-msg" data-ok={codeStep && !/wrong|expired|not/i.test(state.message)} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>
          {pending ? 'Please wait…' : codeStep ? 'Sign in' : 'Send code'}
        </button>
        {codeStep && (
          <button className="adm-btn adm-btn-quiet" type="submit" name="resend" value="1" formNoValidate disabled={pending}>
            Send a new code
          </button>
        )}
      </div>
    </form>
  );
}
