/**
 * Minimal RFC 5545 reader/writer for OTA availability feeds. Airbnb, Booking.com, Agoda and Vrbo
 * publish all-day VEVENTs (DTSTART;VALUE=DATE … DTEND exclusive) without guest details.
 */
import { addDays, nightsBetween } from '@staydirect/shared';

export interface IcalEvent {
  uid: string;
  start: string; // YYYY-MM-DD, first night
  end: string; // YYYY-MM-DD, check-out (exclusive)
  summary: string;
  status: string;
}

/** UIDs we generate end with this, so a feed that echoes our own export is ignored. */
export const OWN_UID_SUFFIX = '@staydirect.lk';

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseDateValue(value: string): string | null {
  // 20270105, 20270105T140000Z, 20270105T140000
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
}

export function parseIcal(text: string): IcalEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('Not an iCalendar feed');
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;
  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper === 'BEGIN:VEVENT') {
      cur = { summary: '', status: '' };
      continue;
    }
    if (upper === 'END:VEVENT') {
      if (cur?.start) {
        const end = cur.end && cur.end > cur.start ? cur.end : addDays(cur.start, 1);
        events.push({
          uid: cur.uid || `${cur.start}-${end}`,
          start: cur.start,
          end,
          summary: cur.summary ?? '',
          status: (cur.status ?? '').toUpperCase(),
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(';')[0]!.toUpperCase();
    const value = line.slice(idx + 1);
    if (name === 'UID') cur.uid = value.trim();
    else if (name === 'DTSTART') cur.start = parseDateValue(value) ?? undefined;
    else if (name === 'DTEND') cur.end = parseDateValue(value) ?? undefined;
    else if (name === 'SUMMARY') cur.summary = unescapeText(value);
    else if (name === 'STATUS') cur.status = value.trim();
  }
  return events;
}

/** The occupied nights a feed asserts, as uid → dates. Cancelled events and our own echoes are skipped. */
export function feedNights(events: IcalEvent[], horizon: { from: string; to: string }): Map<string, string> {
  const nights = new Map<string, string>(); // key `${date}` → uid (first wins)
  for (const e of events) {
    if (e.status === 'CANCELLED' || e.uid.endsWith(OWN_UID_SUFFIX)) continue;
    for (const d of nightsBetween(e.start, e.end)) {
      if (d < horizon.from || d >= horizon.to) continue;
      if (!nights.has(d)) nights.set(d, e.uid);
    }
  }
  return nights;
}

export interface ExportNight {
  date: string;
  status: string;
  groupKey: string; // nights with the same key and consecutive dates become one event
  summary: string;
}

function icsDate(d: string): string {
  return d.replace(/-/g, '');
}

function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push((i ? ' ' : '') + line.slice(i, i + 74));
  return parts.join('\r\n');
}

export function buildIcal(roomName: string, roomToken: string, nights: ExportNight[], now = new Date()): string {
  const sorted = [...nights].sort((a, b) => a.groupKey.localeCompare(b.groupKey) || a.date.localeCompare(b.date));
  const ranges: { start: string; end: string; key: string; summary: string }[] = [];
  for (const n of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last.key === n.groupKey && last.end === n.date) last.end = addDays(n.date, 1);
    else ranges.push({ start: n.date, end: addDays(n.date, 1), key: n.groupKey, summary: n.summary });
  }
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StayDirect LK//Availability//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${roomName.replace(/[,;\\]/g, ' ')}`,
  ];
  for (const r of ranges.sort((a, b) => a.start.localeCompare(b.start))) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${roomToken.slice(0, 8)}-${icsDate(r.start)}-${icsDate(r.end)}${OWN_UID_SUFFIX}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(r.start)}`,
      `DTEND;VALUE=DATE:${icsDate(r.end)}`,
      `SUMMARY:${r.summary}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
