'use client';

import { useActionState } from 'react';
import type { AdminResult } from '@/app/admin/actions';

type Action = (prev: AdminResult | null, fd: FormData) => Promise<AdminResult>;

/**
 * A form bound to an admin server action, with pending state and an inline, announced result.
 * `confirm` asks before submitting (used for append-only money actions).
 */
export function AdminForm({
  action,
  children,
  submitLabel,
  pendingLabel = 'Saving…',
  variant = 'primary',
  confirm,
  className = '',
  layout = 'stack',
  id,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: 'primary' | 'quiet' | 'danger';
  confirm?: string;
  className?: string;
  layout?: 'stack' | 'row';
  /** Lets inputs elsewhere in a table row join this form via form="id". */
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      id={id}
      action={formAction}
      className={`${layout === 'row' ? 'flex flex-wrap items-end gap-2' : 'space-y-3'} ${className}`}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={`adm-btn adm-btn-${variant}`} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <span className="adm-msg" data-ok={state?.ok} role={state && !state.ok ? 'alert' : 'status'} aria-live="polite">
          {state?.message}
        </span>
      </div>
    </form>
  );
}
