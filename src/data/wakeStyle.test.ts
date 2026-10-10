import { describe, expect, it } from 'vitest';
import { demoRoutines } from './routines';
import { applyWakeStyle, wakeStyleFor } from './wakeStyle';

describe('wake-up style presets', () => {
  it('maps each preset deterministically and recognizes it', () => {
    const routine = demoRoutines[0]!;
    for (const style of ['Gentle', 'Balanced', 'Energetic'] as const) {
      expect(wakeStyleFor(applyWakeStyle(routine, style))).toBe(style);
    }
  });

  it('keeps customized values as Custom until the user selects a preset', () => {
    const routine = { ...demoRoutines[0]!, fadeSeconds: 22 };
    expect(wakeStyleFor(routine)).toBe('Custom');
    expect(wakeStyleFor(applyWakeStyle(routine, 'Gentle'))).toBe('Gentle');
  });
});
