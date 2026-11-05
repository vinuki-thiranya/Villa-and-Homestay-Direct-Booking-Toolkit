'use client';

import { useState, useTransition } from 'react';
import { deleteHolidayAction, type AdminResult } from '@/app/admin/actions';

/** Delete a holiday with the confirmation shown in the row itself (no browser dialog). */
export function HolidayDelete({ date, nameEn }: { date: string; nameEn: string }) {
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <button type="button" className="adm-btn adm-btn-quiet" onClick={() => setAsking(true)} aria-label={`Delete ${nameEn} on ${date}`}>
        Delete
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm deleting ${nameEn}`}>
      <span className="text-sm">Delete {nameEn}?</span>
      <button
        type="button"
        className="adm-btn adm-btn-danger"
        disabled={pending}
        onClick={() => start(async () => setResult(await deleteHolidayAction(date, nameEn)))}
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" className="adm-btn adm-btn-quiet" disabled={pending} onClick={() => setAsking(false)}>
        Keep
      </button>
      {result && !result.ok && (
        <span className="adm-msg" data-ok="false" role="alert">
          {result.message}
        </span>
      )}
    </div>
  );
}
