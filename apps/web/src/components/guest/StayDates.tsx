'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { addDaysIso } from '@/lib/calendar';

// The calendar (and motion) load on the first tap, not with the page.
const loadCalendar = () => import('./RangeCalendar');
const RangeCalendar = dynamic(loadCalendar, { ssr: false });

const SHOW = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const show = (iso: string) => SHOW.format(new Date(`${iso}T00:00:00Z`));

interface Props {
  site: string;
  /** Controlled value (checkout form); omit to let the component hold the value (search form). */
  value?: { from: string; to: string };
  defaultValue?: { from?: string; to?: string };
  onChange?: (v: { from: string; to: string }) => void;
  idPrefix: string;
}

/**
 * Check-in and check-out fields. Server-rendered as native date inputs named from/to, so the search
 * form works without JavaScript. Once hydrated they become buttons that open the availability
 * calendar, with hidden inputs carrying the ISO dates.
 */
export function StayDates({ site, value, defaultValue, onChange, idPrefix }: Props) {
  const [inner, setInner] = useState({ from: defaultValue?.from ?? '', to: defaultValue?.to ?? '' });
  const v = value ?? inner;
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState<null | 'from' | 'to'>(null);
  const [opened, setOpened] = useState(false); // keep the sheet mounted so it can animate out
  const today = new Date().toISOString().slice(0, 10);

  const fromButton = useRef<HTMLButtonElement>(null);
  const latest = useRef(v);
  latest.current = v;

  useEffect(() => setEnhanced(true), []);

  // Submitting without dates opens the calendar instead of loading an empty search.
  useEffect(() => {
    const form = fromButton.current?.form;
    if (!form) return;
    const guard = (e: SubmitEvent) => {
      if (!latest.current.from || !latest.current.to) {
        e.preventDefault();
        openAt(latest.current.from ? 'to' : 'from');
      }
    };
    form.addEventListener('submit', guard);
    return () => form.removeEventListener('submit', guard);
  }, [enhanced]);

  function openAt(which: 'from' | 'to') {
    setOpened(true);
    setOpen(which);
  }

  function set(next: { from: string; to: string }) {
    if (!value) setInner(next);
    onChange?.(next);
  }

  const field = (which: 'from' | 'to', label: string) => {
    const id = `${idPrefix}-${which}`;
    const iso = v[which];
    return (
      <div>
        <label htmlFor={id} className="label">
          {label}
        </label>
        {enhanced ? (
          <>
            <input type="hidden" name={which} value={iso} />
            <button
              type="button"
              id={id}
              ref={which === 'from' ? fromButton : undefined}
              aria-haspopup="dialog"
              onClick={() => openAt(which)}
              onPointerEnter={() => void loadCalendar()}
              onFocus={() => void loadCalendar()}
              className="field flex items-center gap-2 text-left"
            >
              <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-muted" />
              <span className={`truncate ${iso ? '' : 'text-muted'}`}>{iso ? show(iso) : 'Add date'}</span>
            </button>
          </>
        ) : (
          <input
            id={id}
            name={which}
            type="date"
            required
            min={which === 'to' && v.from ? addDaysIso(v.from, 1) : today}
            value={iso}
            onChange={(e) =>
              set(
                which === 'from'
                  ? { from: e.target.value, to: v.to && v.to > e.target.value ? v.to : addDaysIso(e.target.value, 2) }
                  : { from: v.from, to: e.target.value },
              )
            }
            className="field"
          />
        )}
      </div>
    );
  };

  return (
    <>
      {field('from', 'Check-in')}
      {field('to', 'Check-out')}
      {opened && (
        <RangeCalendar
          open={open !== null}
          site={site}
          focus={open ?? 'from'}
          value={{ from: v.from || null, to: v.to || null }}
          onClose={() => setOpen(null)}
          onChange={set}
        />
      )}
    </>
  );
}
