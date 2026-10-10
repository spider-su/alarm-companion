import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
    clear: () => values.clear(),
  };
});
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));

import { loadAchievementUnlocks, eligibleAchievementIds, progressForProfile, recoverAchievementUnlocks, removeDeletedProfileUnlocks, unlockEligibleAchievements, undoCompletionUnlocks } from './motivation';
import type { RoutineEvent } from './family';
const now = new Date(2026, 9, 10, 12).getTime();
function completed(id: number, profileId = 'parent', name = 'Routine', extra: Partial<RoutineEvent> = {}): RoutineEvent {
  return { id: `e${id}`, routineId: `r${id}`, routineName: name, type: 'completed', at: now - id * 60_000, profileId, routineType: 'reminder', routineCategory: 'Work', routineTime: '08:00', ...extra };
}

describe('routine motivation', () => {
  beforeEach(() => { storage.clear(); vi.clearAllMocks(); });
  it('calculates profile-isolated progress and excludes alarm or legacy completion events', () => {
    const events = [completed(1), completed(2, 'child-1'), completed(3, 'parent', 'Alarm', { routineType: 'alarm' }), { ...completed(4), routineType: undefined }];
    expect(progressForProfile(events, 'parent', new Date(now))).toEqual({ today: 1, week: 1 });
    expect(progressForProfile(events, 'child-1', new Date(now))).toEqual({ today: 1, week: 1 });
  });
  it('unlocks the catalog at deterministic count, category, time and weekly thresholds', () => {
    const events = Array.from({ length: 10 }, (_, i) => completed(i, 'parent', i < 10 ? 'Homework Time' : 'Routine', { routineCategory: i % 3 === 0 ? 'School' : i % 3 === 1 ? 'Work' : 'Break', routineTime: '08:00' }));
    events.push(...Array.from({ length: 10 }, (_, i) => completed(i + 20, 'parent', 'Prepare for Bed', { routineCategory: 'Bedtime', routineTime: '20:00' })));
    expect(eligibleAchievementIds(events, 'parent', new Date(now))).toEqual(expect.arrayContaining(['first-step', 'getting-started', 'great-week', 'morning-helper', 'homework-hero', 'bedtime-star', 'routine-explorer']));
    expect(eligibleAchievementIds(events, 'child-1', new Date(now))).toEqual([]);
  });
  it('keeps durable unlocks after restart and removes unlocks caused by an undone completion or deleted profile', async () => {
    const events = Array.from({ length: 5 }, (_, i) => completed(i));
    const fresh = await unlockEligibleAchievements(events[0]!, events);
    expect(fresh.map((item) => item.achievementId)).toContain('getting-started');
    expect(await unlockEligibleAchievements(events[0]!, events)).toEqual([]);
    expect((await loadAchievementUnlocks()).length).toBeGreaterThan(0);
    await undoCompletionUnlocks('e0');
    expect((await loadAchievementUnlocks()).every((item) => item.triggeringEventId !== 'e0')).toBe(true);
    await removeDeletedProfileUnlocks('parent');
    expect(await loadAchievementUnlocks()).toEqual([]);
  });
  it('recovers a durable unlock from completion history if the app stopped before saving unlocks', async () => {
    const events = Array.from({ length: 5 }, (_, i) => completed(i));
    await recoverAchievementUnlocks(events, ['everyone', 'parent']);
    expect((await loadAchievementUnlocks()).map((unlock) => unlock.achievementId)).toContain('getting-started');
    await storage.removeItem('alarm-companion.achievement-unlocks.v1');
    await recoverAchievementUnlocks(events, ['everyone']);
    expect(await loadAchievementUnlocks()).toEqual([]);
  });
  it('uses Monday as the local week boundary', () => {
    const monday = new Date(2026, 9, 12, 10);
    const sunday = new Date(2026, 9, 11, 10);
    expect(progressForProfile([completed(1, 'parent', 'Routine', { at: sunday.getTime() })], 'parent', monday).week).toBe(0);
  });
});
