'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/app/owner/actions';
import { useT } from './I18n';

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/**
 * A form bound to a server action, with pending state and an inline result message.
 * Fields are passed as children (server-rendered); the action may be pre-bound with .bind().
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = 'primary',
  className = '',
  confirm,
  inline = false,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  confirm?: string;
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useT();
  const btn = variant === 'danger' ? 'btn-danger' : variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
  return (
    <form
      action={formAction}
      className={`${inline ? 'inline-flex flex-wrap items-center gap-2' : 'space-y-3'} ${className}`}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className={inline ? 'contents' : 'flex flex-wrap items-center gap-3'}>
        <button type="submit" className={btn} disabled={pending}>
          {pending ? (pendingLabel ?? t('shared.saving')) : submitLabel}
        </button>
        {state?.message && (
          <p role={state.ok ? 'status' : 'alert'} className={`text-sm ${state.ok ? 'text-ok' : 'text-bad'}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
