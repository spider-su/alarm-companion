import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return { getItem: vi.fn(async (key: string) => values.get(key) ?? null), setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }), removeItem: vi.fn(async (key: string) => { values.delete(key); }), clear: () => values.clear() };
});
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
import { loadCompletionHistory, loadRoutineHistory, recordRoutineEvent, undoRoutineCompletion } from './family';

describe('local completion persistence', () => {
  beforeEach(() => { storage.clear(); vi.clearAllMocks(); });
  it('prevents duplicate completion per occurrence and supports undo', async () => {
    const event = { routineId: 'r1', routineName: 'Break', type: 'completed' as const, profileId: 'parent', routineType: 'reminder', occurrenceId: 'r1:2026-10-10' };
    const created = await recordRoutineEvent(event, 1_000);
    expect(await recordRoutineEvent(event, 1_001)).toBeUndefined();
    expect(await loadCompletionHistory()).toHaveLength(1);
    await undoRoutineCompletion(created!.id);
    expect(await loadCompletionHistory()).toEqual([]);
  });
  it('keeps old completions for durable achievements while recent activity remains 30 days', async () => {
    const old = await recordRoutineEvent({ routineId: 'r1', routineName: 'Break', type: 'completed', routineType: 'reminder', occurrenceId: 'r1:old' }, 1_000);
    await recordRoutineEvent({ routineId: 'r2', routineName: 'Alarm', type: 'dismissed' }, 31 * 86400_000);
    expect(await loadCompletionHistory()).toEqual([old]);
    expect(await loadRoutineHistory(62 * 86400_000)).toEqual([]);
  });
  it('keeps denormalized completion details after a routine is deleted', async () => {
    await recordRoutineEvent({ routineId: 'deleted-routine', routineName: 'School Reminder', type: 'completed', routineType: 'reminder', routineCategory: 'School', routineTime: '08:00', occurrenceId: 'deleted-routine:2026-10-10' }, 1_000);
    expect(await loadCompletionHistory()).toMatchObject([{ routineId: 'deleted-routine', routineName: 'School Reminder', routineCategory: 'School' }]);
  });
});
