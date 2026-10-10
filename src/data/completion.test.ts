import { describe, expect, it } from 'vitest';
import { completionForOccurrence, occurrenceIdForToday } from './completion';
import type { Routine } from './routines';
const base: Routine = { id: 'break', name: 'Break', type: 'reminder', time: '09:00', repeat: 'daily', days: [], enabled: true, sound: 'chime', introSeconds: 0, fadeSeconds: 0, backgroundVolume: 0.5, voiceVolume: 1, repeatVoice: false, snoozeMinutes: 5, notificationIds: [] };
describe('routine completion occurrence', () => {
  it('creates one local-day occurrence only after its scheduled time', () => {
    const after = new Date(2026, 9, 10, 9, 30);
    const before = new Date(2026, 9, 10, 8, 59);
    expect(occurrenceIdForToday(base, after)).toBe('break:2026-10-10');
    expect(occurrenceIdForToday(base, before)).toBeUndefined();
    expect(occurrenceIdForToday({ ...base, type: 'alarm' }, after)).toBeUndefined();
  });
  it('respects repeat days and reads the existing completion for one occurrence', () => {
    const sunday = new Date(2026, 9, 11, 10);
    expect(occurrenceIdForToday({ ...base, repeat: 'weekdays' }, sunday)).toBeUndefined();
    expect(completionForOccurrence([{ id: 'done', routineId: 'break', routineName: 'Break', type: 'completed', at: 1, occurrenceId: 'break:2026-10-10' }], 'break:2026-10-10')?.id).toBe('done');
  });
});
