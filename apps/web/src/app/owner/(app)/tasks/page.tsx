import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { fmtDate, fmtDateTime, money } from '@/lib/format';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { TASK_STATUS_LABEL, TASK_TYPE_LABEL, type Staff, type Task } from '@/lib/owner-types';
import { buildBoardAction, createTaskAction, taskPhotoAction, updateTaskAction } from '../../actions-r2';

export const metadata = { title: 'Tasks' };

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const property = await currentProperty();
  if (!property) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: property.timezone }).format(new Date());
  const q = await searchParams;
  const date = q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : today;
  const [tasks, staff, rooms] = await Promise.all([
    ownerApi<Task[]>(`/properties/${property.id}/tasks?from=${date}&to=${date}`),
    ownerApi<Staff[]>(`/properties/${property.id}/staff`),
    ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`),
  ]);
  const open = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const closed = tasks.filter((t) => t.status === 'done' || t.status === 'skipped');
  const activeStaff = staff.filter((s) => s.active);
  const staffOptions: [string, string][] = [['', 'Unassigned'], ...activeStaff.map((s) => [s.id, s.name] as [string, string])];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <nav aria-label="Day" className="ml-auto flex items-center gap-1">
          <Link href={`/owner/tasks?date=${shift(date, -1)}`} className="btn-secondary min-h-10 px-3" aria-label="Previous day">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/owner/tasks" className={`btn-secondary min-h-10 px-4 ${date === today ? 'border-brand text-brand' : ''}`}>
            {date === today ? 'Today' : fmtDate(date)}
          </Link>
          <Link href={`/owner/tasks?date=${shift(date, 1)}`} className="btn-secondary min-h-10 px-3" aria-label="Next day">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        </nav>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <p className="flex-1 text-sm">
          <strong>
            {closed.length} of {tasks.length}
          </strong>{' '}
          done{date === today ? ' today' : ` on ${fmtDate(date)}`}.{' '}
          <span className="text-muted">Check-outs to clean and check-ins to prepare are added at 6 am and cleaners get their list on WhatsApp.</span>
        </p>
        {date === today && <ActionForm action={buildBoardAction.bind(null, property.id)} submitLabel="Build today's board" variant="secondary" inline />}
      </div>

      {tasks.length === 0 ? (
        <Empty>No tasks for {fmtDate(date)}.</Empty>
      ) : (
        <div className="space-y-5">
          {open.length > 0 && (
            <ul className="space-y-3" aria-label="To do">
              {open.map((t) => (
                <TaskCard key={t.id} t={t} staffOptions={staffOptions} currency={property.baseCurrency} />
              ))}
            </ul>
          )}
          {closed.length > 0 && (
            <details open={open.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold text-muted">Done and skipped ({closed.length})</summary>
              <ul className="mt-3 space-y-3">
                {closed.map((t) => (
                  <TaskCard key={t.id} t={t} staffOptions={staffOptions} currency={property.baseCurrency} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <Section title="Add a task">
        <ActionForm action={createTaskAction.bind(null, property.id)} submitLabel="Add task">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Date" name="date" type="date" required defaultValue={date} />
            <Select label="Type" name="type" options={Object.entries(TASK_TYPE_LABEL) as [string, string][]} defaultValue="maintenance" />
            <Select label="Room" name="roomId" options={[['', 'Whole property'], ...rooms.map((r) => [r.id, r.name] as [string, string])]} />
            <Select label="Assign to" name="assigneeStaffId" options={staffOptions} />
          </div>
          <Field label="What needs doing" name="title" required maxLength={160} placeholder="Fix dripping tap, buy breakfast eggs…" />
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <TextArea label="Notes" name="notes" rows={2} />
            <Field label={`Cost (${property.baseCurrency})`} name="cost" type="number" min={0} step="0.01" hint="Maintenance log" />
          </div>
        </ActionForm>
      </Section>
    </div>
  );
}

function TaskCard({ t, staffOptions, currency }: { t: Task; staffOptions: [string, string][]; currency: string }) {
  const done = t.status === 'done' || t.status === 'skipped';
  const tone =
    t.status === 'done' ? 'bg-ok-bg text-ok' : t.status === 'in_progress' ? 'bg-warn-bg text-warn' : t.status === 'skipped' ? 'bg-surface-2 text-muted' : 'bg-bad-bg text-bad';
  return (
    <li className={`card p-4 ${done ? 'opacity-80' : ''}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t.title}</p>
          <p className="text-sm text-muted">
            {TASK_TYPE_LABEL[t.type]}
            {t.roomName ? ` · ${t.roomName}` : ''}
            {t.bookingReference ? ` · ${t.bookingReference}` : ''}
            {t.assigneeName ? ` · ${t.assigneeName}` : ''}
            {t.cost != null ? ` · ${money(t.cost, currency)}` : ''}
          </p>
          {t.notes && <p className="mt-1 text-sm">{t.notes}</p>}
          {t.completedAt && <p className="text-xs text-muted">Done {fmtDateTime(t.completedAt)}</p>}
        </div>
        <span className={`pill ${tone}`}>{TASK_STATUS_LABEL[t.status]}</span>
      </div>

      {t.photos.length > 0 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Photos">
          {t.photos.map((src) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on arbitrary hosts */}
                <img src={src} alt="Task photo" className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!done && t.status === 'todo' && <ActionForm action={updateTaskAction.bind(null, t.id, { status: 'in_progress' })} submitLabel="Start" variant="secondary" inline />}
        {!done && <ActionForm action={updateTaskAction.bind(null, t.id, { status: 'done' })} submitLabel="Done" inline />}
        {!done && <ActionForm action={updateTaskAction.bind(null, t.id, { status: 'skipped' })} submitLabel="Skip" variant="secondary" inline />}
        {done && <ActionForm action={updateTaskAction.bind(null, t.id, { status: 'todo' })} submitLabel="Reopen" variant="secondary" inline />}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand">Assign, notes, cost, photo</summary>
        <div className="mt-3 space-y-3">
          <ActionForm action={updateTaskAction.bind(null, t.id, {})} submitLabel="Save" variant="secondary">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Assigned to" name="assigneeStaffId" id={`as-${t.id}`} options={staffOptions} defaultValue={t.assigneeStaffId ?? ''} />
              <Field label="Cost" name="cost" id={`cost-${t.id}`} type="number" min={0} step="0.01" defaultValue={t.cost ?? ''} />
              <Field label="Notes" name="notes" id={`notes-${t.id}`} defaultValue={t.notes} />
            </div>
          </ActionForm>
          <ActionForm action={taskPhotoAction.bind(null, t.id)} submitLabel="Upload photo" variant="secondary" inline>
            <label htmlFor={`photo-${t.id}`} className="sr-only">
              Photo
            </label>
            <input id={`photo-${t.id}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required className="text-sm" />
          </ActionForm>
        </div>
      </details>
    </li>
  );
}
