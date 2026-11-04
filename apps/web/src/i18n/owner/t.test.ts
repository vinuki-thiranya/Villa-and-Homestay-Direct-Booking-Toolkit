import { describe, expect, it } from 'vitest';
import { makeT } from './t';

describe('owner translations', () => {
  it('formats Sinhala dates with modern month names (not the Poya month names ICU uses)', () => {
    const t = makeT('si');
    expect(t.date('2026-11-05')).toBe('5 නොවැ 2026');
    expect(t.short('2026-01-03')).toBe('3 ජන');
    expect(t.month('2026-11')).toBe('නොවැම්බර් 2026');
    expect(t.month('2026-12-23', 'short')).toBe('දෙසැ');
    expect(t.date('2026-11-24')).not.toContain('ඉල්');
    expect(t.dateTime('2026-11-04T18:30:00Z')).toBe('5 නොවැ 2026, 00:00'); // Colombo is UTC+05:30
  });

  it('keeps English dates as before and fills placeholders and counts', () => {
    const t = makeT('en');
    expect(t.date('2026-11-05')).toBe('5 Nov 2026');
    expect(t.month('2026-11')).toBe('November 2026');
    expect(t('common.greetingWithName', { greeting: t('common.greetingMorning'), name: 'Nimali' })).toBe('Good morning, Nimali');
    expect(t.n('common.nights', 1)).toBe('1 night');
    expect(t.n('common.nights', 3)).toBe('3 nights');
    expect(makeT('si').n('common.nights', 3)).toBe('රාත්‍රී 3');
  });
});
