'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Phone, XCircle } from 'lucide-react';
import { publicApi } from '@/lib/client-api';
import { fmtDate, formatMoney, waLink } from '@/lib/format';

interface Job {
  service: string;
  property: string;
  address: string;
  mapsUrl: string | null;
  date: string;
  time: string | null;
  qty: number;
  guestName: string | null;
  guestPhone: string | null;
  notes: string;
  payout: number;
  currency: string;
  status: 'requested' | 'confirmed' | 'done' | 'cancelled';
}

const STATUS: Record<string, string> = { requested: 'Waiting for you', confirmed: 'Accepted', done: 'Completed', cancelled: 'Cancelled' };

/** Provider job card from the WhatsApp link: accept, complete or decline (spec §3.7). */
export function JobCard({ token }: { token: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);

  const load = useCallback(async () => {
    try {
      setJob(await publicApi<Job>(`/public/jobs/${encodeURIComponent(token)}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the job');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: 'confirm' | 'done' | 'decline') {
    setBusy(true);
    try {
      const res = await publicApi<Job & { declined?: boolean }>(`/public/jobs/${encodeURIComponent(token)}`, { json: { action } });
      if (action === 'decline') setDeclined(true);
      else setJob(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the job');
    } finally {
      setBusy(false);
    }
  }

  if (error && !job) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold">This job link doesn&apos;t work any more</p>
        <p className="mt-2 text-muted">Please contact the property.</p>
      </div>
    );
  }
  if (!job) return <div className="card h-56 animate-pulse" aria-busy="true" aria-label="Loading job" />;

  const wa = waLink(job.guestPhone);
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm text-muted">New job from {job.property}</p>
        <h1 className="text-2xl font-semibold">{job.service}</h1>
        <p className={`pill mt-2 ${job.status === 'confirmed' || job.status === 'done' ? 'bg-ok-bg text-ok' : job.status === 'cancelled' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}`}>
          {STATUS[job.status]}
        </p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
          <dt className="text-muted">When</dt>
          <dd className="font-semibold">
            {fmtDate(job.date)}
            {job.time ? ` at ${job.time}` : ''}
          </dd>
          <dt className="text-muted">Guest</dt>
          <dd>
            {job.guestName ?? 'Guest'} · {job.qty}
          </dd>
          <dt className="text-muted">Your pay</dt>
          <dd className="font-semibold">{formatMoney(job.payout, job.currency)}</dd>
          <dt className="text-muted">Pickup</dt>
          <dd>{job.address}</dd>
        </dl>
        {job.notes && <p className="mt-3 rounded-xl bg-surface-2 p-3">“{job.notes}”</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {job.mapsUrl && (
            <a href={job.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-12">
              <MapPin aria-hidden className="h-5 w-5" /> Map
            </a>
          )}
          {job.guestPhone && (
            <>
              <a href={`tel:${job.guestPhone}`} className="btn-secondary min-h-12">
                <Phone aria-hidden className="h-5 w-5" /> {job.guestPhone}
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-12">
                  WhatsApp guest
                </a>
              )}
            </>
          )}
        </div>
        {!job.guestPhone && job.status === 'requested' && <p className="mt-2 text-sm text-muted">The guest&apos;s phone number is shown once you accept.</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-bad-bg p-3 text-sm text-bad">
          {error}
        </p>
      )}

      {declined ? (
        <p className="card p-5 text-center" role="status">
          Thanks for letting us know — the property will arrange someone else.
        </p>
      ) : job.status === 'requested' ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-danger min-h-14 text-base" disabled={busy} onClick={() => void act('decline')}>
            <XCircle aria-hidden className="h-5 w-5" /> Can&apos;t do it
          </button>
          <button type="button" className="btn-primary min-h-14 text-base" disabled={busy} onClick={() => void act('confirm')}>
            <CheckCircle2 aria-hidden className="h-5 w-5" /> Accept
          </button>
        </div>
      ) : job.status === 'confirmed' ? (
        <button type="button" className="btn-primary min-h-14 w-full text-base" disabled={busy} onClick={() => void act('done')}>
          <CheckCircle2 aria-hidden className="h-5 w-5" /> Mark as completed
        </button>
      ) : null}
    </div>
  );
}
