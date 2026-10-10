import { describe, expect, it } from 'vitest';
import { initialProfiles, recentEvents, routinesForProfile, routineTemplates } from './family';

describe('family routines', () => {
  it('bundles all editable routine presets and the shared profile', () => {
    expect(routineTemplates.map((item) => item.name)).toEqual(['Good Morning', 'Time for School', 'Time for Work', 'Take a Break', 'Homework Time', 'Family Time', 'Prepare for Bed', 'Sleep Time']);
    expect(initialProfiles[0]?.id).toBe('everyone');
  });
  it('filters a profile to its routines plus shared routines and treats legacy data as shared', () => {
    const routines = [{ name: 'shared' }, { name: 'parent', familyProfileId: 'parent' }, { name: 'child', familyProfileId: 'child-1' }];
    expect(routinesForProfile(routines, 'parent').map((item) => item.name)).toEqual(['shared', 'parent']);
  });
  it('keeps only recent events and sorts newest first', () => {
    const now = 40 * 86400_000;
    expect(recentEvents([{ at: now - 31 * 86400_000 }, { at: now - 1 }, { at: now - 100 }], now)).toEqual([{ at: now - 1 }, { at: now - 100 }]);
  });
});
