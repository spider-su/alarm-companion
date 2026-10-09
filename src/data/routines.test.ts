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
import { DEFAULT_PROFILE_ID, loadVoiceLibrary, saveVoiceLibrary } from './voices';

describe('local routine defaults and persistence', () => {
  beforeEach(() => { storage.clear(); vi.clearAllMocks(); });
  it('seeds editable demo routines disabled by default', async () => {
    const items = await loadRoutines();
    expect(items.map((item) => item.name)).toEqual(['Good Morning', 'School Reminder', 'Bedtime']);
    expect(items.every((item) => !item.enabled)).toBe(true);
    expect(items[0]).toMatchObject({ voiceProfileId: DEFAULT_PROFILE_ID, messageVariants: [{ text: "Good morning! It's time to wake up. Have a wonderful day!" }], sound: 'birds' });
  });
  it('persists edited routine data through local storage', async () => {
    const edited = demoRoutines.map((routine) => ({ ...routine }));
    edited[0]!.enabled = true;
    edited[0]!.messageVariants = [{ id: 'first', text: 'Wake up!' }];
    await saveRoutines(edited);
    const loaded = await loadRoutines();
    expect(loaded[0]).toMatchObject({ enabled: true, messageVariants: [{ id: 'first', text: 'Wake up!' }], voiceProfileId: DEFAULT_PROFILE_ID });
    expect(loaded).toHaveLength(edited.length);
  });
  it('migrates M1 voice fields to shared profiles and message variants', async () => {
    const old = [{ ...demoRoutines[0]!, id: 'old-one', language: 'pl-PL' as const, voice: 'pl-voice', speed: 1.2, pitch: 1.1 }, { ...demoRoutines[0]!, id: 'old-two', language: 'pl-PL' as const, voice: 'pl-voice', speed: 1.2, pitch: 1.1 }];
    await saveRoutines(old);
    const migrated = await loadRoutines();
    expect(migrated[0]?.voiceProfileId).toEqual(migrated[1]?.voiceProfileId);
    expect(migrated[0]?.messageVariants?.[0]?.text).toBe(old[0]?.message);
    expect(migrated[0]?.language).toBeUndefined();
    await expect(loadVoiceLibrary()).resolves.toMatchObject({ defaultProfileId: DEFAULT_PROFILE_ID });
  });
  it('persists reusable voice profiles on device storage', async () => {
    const library = await loadVoiceLibrary();
    const updated = { ...library, profiles: [...library.profiles, { id: 'mom', name: "Mom's voice", kind: 'recording' as const, recordingIds: ['clip-1'] }] };
    await saveVoiceLibrary(updated);
    await expect(loadVoiceLibrary()).resolves.toEqual(updated);
  });
});
