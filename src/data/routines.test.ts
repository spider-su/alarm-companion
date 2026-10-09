import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
    clear: () => values.clear()
  };
});
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));

import { demoRoutines, loadRoutines, saveRoutines } from './routines';

describe('local routine defaults and persistence', () => {
  beforeEach(() => { storage.clear(); vi.clearAllMocks(); });
  it('seeds editable demo routines disabled by default', async () => {
    const items = await loadRoutines();
    expect(items.map((item) => item.name)).toEqual(['Good Morning', 'School Reminder', 'Bedtime']);
    expect(items.every((item) => !item.enabled)).toBe(true);
    expect(items[0]).toMatchObject({ tone: 'Gentle', speed: 0.9, pitch: 1, sound: 'birds' });
  });
  it('persists edited routine data through local storage', async () => {
    const edited = demoRoutines.map((routine) => ({ ...routine }));
    edited[0]!.enabled = true;
    edited[0]!.message = 'Wake up!';
    await saveRoutines(edited);
    await expect(loadRoutines()).resolves.toEqual(edited);
  });
});
