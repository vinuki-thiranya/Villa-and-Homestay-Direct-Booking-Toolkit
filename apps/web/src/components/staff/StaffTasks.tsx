'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, Play, SkipForward } from 'lucide-react';
import { publicApi } from '@/lib/client-api';

interface StaffTask {
  id: string;
  roomName: string | null;
  type: 'clean' | 'prepare' | 'maintenance' | 'shopping';
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'skipped';
  photos: string[];
  notes: string;
  assigneeName: string | null;
}

interface StaffDay {
  staffName: string;
  propertyName: string;
  date: string;
  tasks: StaffTask[];
}

const TYPE: Record<string, string> = { clean: 'Clean', prepare: 'Prepare', maintenance: 'Fix', shopping: 'Buy' };
const STATUS: Record<string, string> = { todo: 'To do', in_progress: 'Started', done: 'Done', skipped: 'Skipped' };

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Cleaner's task list opened from a WhatsApp link: big buttons, no login (spec §5 "cleaner view"). */
export function StaffTasks({ token }: { token: string }) {
  const [day, setDay] = useState<StaffDay | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (d?: string | null) => {
      try {
        const res = await publicApi<StaffDay>(`/public/staff/${encodeURIComponent(token)}/tasks${d ? `?date=${d}` : ''}`);
        setDay(res);
        setDate(res.date);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your tasks');
      }
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(task: StaffTask, status: 'in_progress' | 'done' | 'skipped') {
    setBusy(task.id);
    try {
      await publicApi(`/public/staff/${encodeURIComponent(token)}/tasks/${task.id}`, { json: { status } });
      await load(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the task');
    } finally {
      setBusy(null);
    }
  }

  async function upload(task: StaffTask, file: File) {
    setBusy(task.id);
    try {
      const fd = new FormData();
      fd.set('file', file);
      await publicApi(`/public/staff/${encodeURIComponent(token)}/tasks/${task.id}/photos`, { form: fd });
      await load(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the photo');
    } finally {
      setBusy(null);
    }
  }

  if (error && !day) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold">This link doesn&apos;t work any more</p>
        <p className="mt-2 text-muted">Ask the owner to send you a new one.</p>
      </div>
    );
  }
  if (!day) return <div className="card h-48 animate-pulse" aria-busy="true" aria-label="Loading tasks" />;

  const open = day.tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const finished = day.tasks.filter((t) => t.status === 'done' || t.status === 'skipped');

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-muted">{day.propertyName}</p>
        <h1 className="text-2xl font-semibold">Hi {day.staffName}</h1>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" className="btn-secondary min-h-12 px-3" aria-label="Previous day" onClick={() => void load(shift(day.date, -1))}>
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
          <p className="flex-1 text-center font-semibold">
            {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T00:00:00Z`))}
          </p>
          <button type="button" className="btn-secondary min-h-12 px-3" aria-label="Next day" onClick={() => void load(shift(day.date, 1))}>
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-sm text-muted">
          {finished.length} of {day.tasks.length} done
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-bad-bg p-3 text-sm text-bad">
          {error}
        </p>
      )}

      {day.tasks.length === 0 && <p className="card p-6 text-center text-muted">Nothing to do today. 🌴</p>}

      <ul className="space-y-3">
        {[...open, ...finished].map((t) => {
          const done = t.status === 'done' || t.status === 'skipped';
          return (
            <li key={t.id} className={`card p-4 ${done ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {TYPE[t.type]} {t.roomName ? `· ${t.roomName}` : ''}
                  </p>
                  <p className="text-lg font-semibold">{t.title}</p>
                  {t.notes && <p className="text-sm text-muted">{t.notes}</p>}
                </div>
                <span className={`pill ${t.status === 'done' ? 'bg-ok-bg text-ok' : t.status === 'in_progress' ? 'bg-warn-bg text-warn' : 'bg-surface-2 text-muted'}`}>
                  {STATUS[t.status]}
                </span>
              </div>
              {t.photos.length > 0 && <p className="mt-2 text-sm text-muted">📷 {t.photos.length} photo{t.photos.length === 1 ? '' : 's'}</p>}
              {!done && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {t.status === 'todo' ? (
                    <button type="button" className="btn-secondary min-h-14 text-base" disabled={busy === t.id} onClick={() => void setStatus(t, 'in_progress')}>
                      <Play aria-hidden className="h-5 w-5" /> Start
                    </button>
                  ) : (
                    <button type="button" className="btn-secondary min-h-14 text-base" disabled={busy === t.id} onClick={() => void setStatus(t, 'skipped')}>
                      <SkipForward aria-hidden className="h-5 w-5" /> Skip
                    </button>
                  )}
                  <button type="button" className="btn-primary min-h-14 text-base" disabled={busy === t.id} onClick={() => void setStatus(t, 'done')}>
                    <CheckCircle2 aria-hidden className="h-5 w-5" /> Done
                  </button>
                </div>
              )}
              <label className="btn-secondary mt-2 min-h-12 w-full cursor-pointer">
                <Camera aria-hidden className="h-5 w-5" /> {busy === t.id ? 'Uploading…' : 'Add photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  disabled={busy === t.id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(t, f);
                    e.target.value = '';
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
