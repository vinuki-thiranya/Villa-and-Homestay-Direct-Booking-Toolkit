import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { tLabel } from '@/components/owner/labels';
import type { Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import type { Staff, Task } from '@/lib/owner-types';
import { buildBoardAction, createTaskAction, taskPhotoAction, updateTaskAction } from '../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('tasks.title') };
}

const TASK_TYPES = ['clean', 'prepare', 'maintenance', 'shopping'] as const;

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
  const [tasks, staff, rooms, t] = await Promise.all([
    ownerApi<Task[]>(`/properties/${property.id}/tasks?from=${date}&to=${date}`),
    ownerApi<Staff[]>(`/properties/${property.id}/staff`),
    ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`),
    getT(),
  ]);
  const open = tasks.filter((x) => x.status === 'todo' || x.status === 'in_progress');
  const closed = tasks.filter((x) => x.status === 'done' || x.status === 'skipped');
  const activeStaff = staff.filter((s) => s.active);
  const staffOptions: [string, string][] = [['', t('tasks.add.unassigned')], ...activeStaff.map((s) => [s.id, s.name] as [string, string])];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{t('tasks.title')}</h1>
        <nav aria-label={t('tasks.dayNav')} className="ml-auto flex items-center gap-1">
          <Link href={`/owner/tasks?date=${shift(date, -1)}`} className="btn-secondary min-h-10 px-3" aria-label={t('tasks.prevDay')}>
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Link>
          <Link href="/owner/tasks" className={`btn-secondary min-h-10 px-4 ${date === today ? 'border-brand text-brand' : ''}`}>
            {date === today ? t('tasks.today') : t.date(date)}
          </Link>
          <Link href={`/owner/tasks?date=${shift(date, 1)}`} className="btn-secondary min-h-10 px-3" aria-label={t('tasks.nextDay')}>
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        </nav>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <p className="flex-1 text-sm">
          <strong>{t('tasks.doneOf', { done: closed.length, total: tasks.length })}</strong>{' '}
          {date === today ? t('tasks.doneToday') : t('tasks.doneOn', { date: t.date(date) })} <span className="text-muted">{t('tasks.boardNote')}</span>
        </p>
        {date === today && <ActionForm action={buildBoardAction.bind(null, property.id)} submitLabel={t('tasks.buildBoard')} variant="secondary" inline />}
      </div>

      {tasks.length === 0 ? (
        <Empty>{t('tasks.none', { date: t.date(date) })}</Empty>
      ) : (
        <div className="space-y-5">
          {open.length > 0 && (
            <ul className="space-y-3" aria-label={t('tasks.todo')}>
              {open.map((x) => (
                <TaskCard key={x.id} task={x} staffOptions={staffOptions} currency={property.baseCurrency} t={t} />
              ))}
            </ul>
          )}
          {closed.length > 0 && (
            <details open={open.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold text-muted">{t('tasks.doneSkipped', { n: closed.length })}</summary>
              <ul className="mt-3 space-y-3">
                {closed.map((x) => (
                  <TaskCard key={x.id} task={x} staffOptions={staffOptions} currency={property.baseCurrency} t={t} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <Section title={t('tasks.add.title')}>
        <ActionForm action={createTaskAction.bind(null, property.id)} submitLabel={t('tasks.add.submit')}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={t('tasks.add.date')} name="date" type="date" required defaultValue={date} />
            <Select
              label={t('tasks.add.type')}
              name="type"
              options={TASK_TYPES.map((k) => [k, tLabel(t, 'taskType', k)] as [string, string])}
              defaultValue="maintenance"
            />
            <Select label={t('tasks.add.room')} name="roomId" options={[['', t('tasks.add.wholeProperty')], ...rooms.map((r) => [r.id, r.name] as [string, string])]} />
            <Select label={t('tasks.add.assignTo')} name="assigneeStaffId" options={staffOptions} />
          </div>
          <Field label={t('tasks.add.what')} name="title" required maxLength={160} placeholder={t('tasks.add.whatPlaceholder')} />
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <TextArea label={t('tasks.add.notes')} name="notes" rows={2} />
            <Field label={t('tasks.add.cost', { currency: property.baseCurrency })} name="cost" type="number" min={0} step="0.01" hint={t('tasks.add.costHint')} />
          </div>
        </ActionForm>
      </Section>
    </div>
  );
}

function TaskCard({ task: k, staffOptions, currency, t }: { task: Task; staffOptions: [string, string][]; currency: string; t: Translator }) {
  const done = k.status === 'done' || k.status === 'skipped';
  const tone =
    k.status === 'done' ? 'bg-ok-bg text-ok' : k.status === 'in_progress' ? 'bg-warn-bg text-warn' : k.status === 'skipped' ? 'bg-surface-2 text-muted' : 'bg-bad-bg text-bad';
  return (
    <li className={`card p-4 ${done ? 'opacity-80' : ''}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{k.title}</p>
          <p className="text-sm text-muted">
            {tLabel(t, 'taskType', k.type)}
            {k.roomName ? ` · ${k.roomName}` : ''}
            {k.bookingReference ? ` · ${k.bookingReference}` : ''}
            {k.assigneeName ? ` · ${k.assigneeName}` : ''}
            {k.cost != null ? ` · ${money(k.cost, currency)}` : ''}
          </p>
          {k.notes && <p className="mt-1 text-sm">{k.notes}</p>}
          {k.completedAt && <p className="text-xs text-muted">{t('tasks.card.doneAt', { time: t.dateTime(k.completedAt) })}</p>}
        </div>
        <span className={`pill ${tone}`}>{tLabel(t, 'taskStatus', k.status)}</span>
      </div>

      {k.photos.length > 0 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label={t('tasks.card.photos')}>
          {k.photos.map((src) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on arbitrary hosts */}
                <img src={src} alt={t('tasks.card.photoAlt')} className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!done && k.status === 'todo' && <ActionForm action={updateTaskAction.bind(null, k.id, { status: 'in_progress' })} submitLabel={t('tasks.card.start')} variant="secondary" inline />}
        {!done && <ActionForm action={updateTaskAction.bind(null, k.id, { status: 'done' })} submitLabel={t('tasks.card.done')} inline />}
        {!done && <ActionForm action={updateTaskAction.bind(null, k.id, { status: 'skipped' })} submitLabel={t('tasks.card.skip')} variant="secondary" inline />}
        {done && <ActionForm action={updateTaskAction.bind(null, k.id, { status: 'todo' })} submitLabel={t('tasks.card.reopen')} variant="secondary" inline />}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand">{t('tasks.card.more')}</summary>
        <div className="mt-3 space-y-3">
          <ActionForm action={updateTaskAction.bind(null, k.id, {})} submitLabel={t('tasks.card.save')} variant="secondary">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label={t('tasks.card.assignedTo')} name="assigneeStaffId" id={`as-${k.id}`} options={staffOptions} defaultValue={k.assigneeStaffId ?? ''} />
              <Field label={t('tasks.card.cost')} name="cost" id={`cost-${k.id}`} type="number" min={0} step="0.01" defaultValue={k.cost ?? ''} />
              <Field label={t('tasks.card.notes')} name="notes" id={`notes-${k.id}`} defaultValue={k.notes} />
            </div>
          </ActionForm>
          <ActionForm action={taskPhotoAction.bind(null, k.id)} submitLabel={t('tasks.card.upload')} variant="secondary" inline>
            <label htmlFor={`photo-${k.id}`} className="sr-only">
              {t('tasks.card.photo')}
            </label>
            <input id={`photo-${k.id}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required className="text-sm" />
          </ActionForm>
        </div>
      </details>
    </li>
  );
}
