import { describe, expect, it, vi } from 'vitest';
import { chooseAvailableRecording, chooseRecording, chooseTextVariant, resolveTtsSettings, type VoiceProfile } from './voices';

describe('voice profiles', () => {
  it('uses tone preset defaults unless explicit overrides are set', () => {
    const profile: VoiceProfile = { id: 'g', name: 'Gentle', kind: 'tts', tts: { language: 'en-US', tone: 'Gentle' } };
    expect(resolveTtsSettings(profile)).toMatchObject({ rate: 0.88, pitch: 0.98 });
    expect(resolveTtsSettings(profile, { speedOverride: 1.2, pitchOverride: 1.1 })).toMatchObject({ rate: 1.2, pitch: 1.1 });
  });

  it('selects a text message variant randomly and falls back to the legacy message', () => {
    const random = vi.fn(() => 0.99);
    expect(chooseTextVariant([{ id: 'a', text: 'One' }, { id: 'b', text: 'Two' }], 'Legacy', random)).toBe('Two');
    expect(chooseTextVariant([], 'Legacy')).toBe('Legacy');
  });
  it('selects among recording clips and handles an empty profile', () => {
    expect(chooseRecording([{ id: 'a' }, { id: 'b' }], () => 0.99)?.id).toBe('b');
    expect(chooseRecording([], () => 0)).toBeUndefined();
  });
  it('skips missing audio files and reports an empty usable collection', () => {
    const profile: VoiceProfile = { id: 'clips', name: 'Clips', kind: 'recording', recordingIds: ['gone', 'ready'] };
    const entries = [{ id: 'gone', uri: '/gone' }, { id: 'ready', uri: '/ready' }];
    expect(chooseAvailableRecording(profile, entries, (uri) => uri === '/ready')?.id).toBe('ready');
    expect(chooseAvailableRecording(profile, entries, () => false)).toBeUndefined();
  });
});
