'use client';

import { AnimatePresence, m } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { SiteCalendar } from '@staydirect/shared';
import { addDaysIso, monthGrid, monthsFrom, nightsIso, pick, selectable, type Range } from '@/lib/calendar';
import { publicApi } from '@/lib/client-api';
import { fmtDate, nightsLabel } from '@/lib/format';
import { GuestMotion } from './GuestMotion';

const MONTHS = 12;
const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Closed nights per site, shared by every picker on the page.
const closedCache = new Map<string, Promise<Set<string>>>();
function loadClosed(site: string, today: string): Promise<Set<string>> {
  let p = closedCache.get(site);
  if (!p) {
    p = publicApi<SiteCalendar>(`/public/sites/${encodeURIComponent(site)}/calendar?from=${today}&to=${addDaysIso(today, 366)}`)
      .then((c) => new Set(c.closed))
      .catch(() => new Set<string>()); // the booking step still checks availability
    closedCache.set(site, p);
  }
  return p;
}

export interface RangeCalendarProps {
  open: boolean;
  site: string;
  value: Range;
  /** Which end the guest tapped: picking starts there. */
  focus: 'from' | 'to';
  onClose: () => void;
  onChange: (r: { from: string; to: string }) => void;
}

/** Date-range dialog: a bottom sheet on phones, a centred panel on wider screens. */
export default function RangeCalendar(props: RangeCalendarProps) {
  return (
    <GuestMotion>
      <AnimatePresence>{props.open && <Sheet key="sheet" {...props} />}</AnimatePresence>
    </GuestMotion>
  );
}

function Sheet({ site, value, focus, onClose, onChange }: RangeCalendarProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>(focus === 'to' && value.from ? { from: value.from, to: null } : value);
  const [active, setActive] = useState<string>(value.from ?? today);
  const dialog = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    let live = true;
    void loadClosed(site, today).then((s) => {
      if (live) {
        setClosed(s);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [site, today]);

  // Modal behaviour: remember focus, lock page scroll, focus the active day, restore on close.
  useEffect(() => {
    returnTo.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>('[data-active="true"]')?.focus({ preventScroll: false }));
    return () => {
      document.body.style.overflow = prev;
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  function choose(day: string) {
    const next = pick(range, day, today, closed);
    setRange(next);
    setActive(day);
    if (next.from && next.to) onChange({ from: next.from, to: next.to });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      // keep focus inside the dialog
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])');
      if (!items?.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, PageUp: -28, PageDown: 28 }[e.key];
    if (!delta || !(e.target as HTMLElement).dataset.day) return;
    e.preventDefault();
    const next = addDaysIso(active, delta);
    if (next < today || next > addDaysIso(today, 365)) return;
    setActive(next);
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  }

  const nights = range.from && range.to ? nightsIso(range.from, range.to) : 0;
  const status = !range.from
    ? 'Choose your check-in date'
    : !range.to
      ? `Check-in ${fmtDate(range.from)}. Now choose check-out.`
      : `${fmtDate(range.from)} to ${fmtDate(range.to)}, ${nightsLabel(nights)}`;

  // Portal to the site root: the search card's stacking context would otherwise trap the dialog under
  // the header and the WhatsApp button. Inside .g-site so the theme variables still apply.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onKeyDown={onKeyDown}>
      <m.div
        className="absolute inset-0 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        aria-hidden
      />
      <m.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-title"
        className="relative flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[calc(var(--radius)+6px)] bg-surface text-fg shadow-2xl sm:max-w-md sm:rounded-[var(--radius)]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
      >
        <div className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h2 id="cal-title" className="g-display text-xl">
              Your dates
            </h2>
            <p className="mt-0.5 text-sm text-muted" aria-live="polite">
              {loading ? 'Loading free dates…' : status}
            </p>
          </div>
          <button type="button" onClick={onClose} className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Close">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-line px-3 py-2 text-center text-xs font-medium text-muted" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {monthsFrom(today, MONTHS).map(([y, mo]) => {
            const label = MONTH_FMT.format(new Date(Date.UTC(y, mo, 1)));
            return (
              <section key={`${y}-${mo}`} aria-label={label} className="pt-4">
                <h3 className="px-1 pb-2 text-sm font-semibold">{label}</h3>
                <div role="grid" aria-label={label} className="grid gap-y-1">
                  {monthGrid(y, mo).map((week, wi) => (
                    <div role="row" key={wi} className="grid grid-cols-7">
                      {week.map((day, di) =>
                        day ? (
                          <Day
                            key={day}
                            day={day}
                            range={range}
                            active={day === active}
                            today={today}
                            closed={closed}
                            onPick={choose}
                          />
                        ) : (
                          <span role="gridcell" key={`x${di}`} />
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-3 g-bookbar">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRange({ from: null, to: null })}
            disabled={!range.from}
          >
            Clear
          </button>
          <button type="button" className="g-cta ml-auto flex-1 sm:flex-none" onClick={onClose} disabled={!range.from || !range.to}>
            {range.from && range.to ? `Use ${nightsLabel(nights)}` : 'Choose dates'}
          </button>
        </div>
      </m.div>
    </div>,
    document.querySelector('.g-site') ?? document.body,
  );
}

function Day({
  day,
  range,
  active,
  today,
  closed,
  onPick,
}: {
  day: string;
  range: Range;
  active: boolean;
  today: string;
  closed: ReadonlySet<string>;
  onPick: (d: string) => void;
}) {
  const isFrom = day === range.from;
  const isTo = day === range.to;
  const inRange = !!range.from && !!range.to && day > range.from && day < range.to;
  const enabled = selectable(range, day, today, closed);
  const isClosed = closed.has(day);
  const label = `${DAY_FMT.format(new Date(`${day}T00:00:00Z`))}${isFrom ? ', check-in' : isTo ? ', check-out' : ''}${
    day < today ? '' : isClosed ? ', booked' : ''
  }`;
  return (
    <div role="gridcell" aria-selected={isFrom || isTo || inRange} className={`relative flex justify-center ${inRange ? 'bg-brand/12' : ''} ${isFrom && range.to ? 'rounded-l-full bg-brand/12' : ''} ${isTo ? 'rounded-r-full bg-brand/12' : ''}`}>
      <button
        type="button"
        data-day={day}
        data-active={active}
        tabIndex={active ? 0 : -1}
        // aria-disabled, not disabled: arrow keys must still be able to move through booked days.
        aria-disabled={!enabled}
        aria-label={label}
        onClick={() => enabled && onPick(day)}
        className={`h-11 w-11 rounded-full text-sm tabular-nums transition-colors ${
          isFrom || isTo
            ? 'bg-brand font-semibold text-brand-fg'
            : enabled
              ? 'hover:bg-surface-2'
              : `cursor-not-allowed text-muted/45 ${isClosed && day >= today ? 'line-through' : ''}`
        }`}
      >
        {Number(day.slice(8))}
      </button>
    </div>
  );
}
