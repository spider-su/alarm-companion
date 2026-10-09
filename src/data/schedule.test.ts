import { describe, expect, it } from 'vitest';
import { nextOccurrence, snoozeOccurrence } from './schedule';

describe('routine scheduling', () => {
  it('skips the weekend for weekday routines', () => {
    const friday = new Date(2026, 9, 9, 18, 0);
    const next = nextOccurrence({ time: '07:00', repeat: 'weekdays', days: [] }, friday);
    expect(next.getDay()).toBe(1);
    expect(next.getHours()).toBe(7);
    expect(next.getDate()).toBe(12);
  });

  it('advances an already passed once event to tomorrow', () => {
    const now = new Date(2026, 9, 9, 7, 1);
    const next = nextOccurrence({ time: '07:00', repeat: 'once', days: [] }, now);
    expect(next.getDate()).toBe(10);
    expect(next.getHours()).toBe(7);
  });

  it('preserves a daily wall-clock time across the spring DST change', () => {
    process.env.TZ = 'Europe/Warsaw';
    const now = new Date(2026, 2, 28, 23, 45);
    const next = nextOccurrence({ time: '03:30', repeat: 'daily', days: [] }, now);
    expect(next.getDate()).toBe(29);
    expect(next.getHours()).toBe(3);
    expect(next.getMinutes()).toBe(30);
  });

  it('calculates snooze as elapsed minutes', () => {
    const now = new Date('2026-10-09T22:58:00.000Z');
    expect(snoozeOccurrence(now, 9).toISOString()).toBe('2026-10-09T23:07:00.000Z');
  });
});
