import { describe, expect, it } from 'vitest';
import { playbackKindFor, shouldReplacePlayback } from './playbackPolicy';

describe('playback priority', () => {
  it('never lets a lower priority event replace an alarm', () => {
    expect(shouldReplacePlayback('alarm', 'spoken-reminder')).toBe(false);
    expect(shouldReplacePlayback('alarm', 'sound-reminder')).toBe(false);
    expect(shouldReplacePlayback('alarm', 'preview')).toBe(false);
  });
  it('lets an alarm replace reminders and previews', () => {
    expect(shouldReplacePlayback('preview', 'alarm')).toBe(true);
    expect(shouldReplacePlayback('spoken-reminder', 'alarm')).toBe(true);
  });
  it('keeps the first event when priorities collide', () => {
    expect(shouldReplacePlayback('alarm', 'alarm')).toBe(false);
  });
  it('blocks lower or equal priority events from replacing active playback', () => {
    expect(shouldReplacePlayback('spoken-reminder', 'sound-reminder')).toBe(false);
    expect(shouldReplacePlayback('sound-reminder', 'spoken-reminder')).toBe(true);
    expect(shouldReplacePlayback('preview', 'sound-reminder')).toBe(true);
  });
  it('classifies spoken reminders separately from sound reminders', () => {
    expect(playbackKindFor({ type: 'reminder', reminderBehavior: 'spoken' })).toBe('spoken-reminder');
  });
});
