import { describe, expect, it, vi } from 'vitest';
import { createPlaybackCleanup, releaseAudioResource } from './playbackCleanup';

describe('playback cleanup', () => {
  it('cancels pending playback work and releases players once', () => {
    const cleanup = createPlaybackCleanup();
    const pause = vi.fn();
    const remove = vi.fn();
    const clearTimer = vi.fn();
    cleanup.add(() => clearTimer());
    cleanup.add(() => releaseAudioResource({ pause, remove }));
    cleanup.cancel();
    cleanup.cancel();
    expect(clearTimer).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('releases a resource registered after cancellation immediately', () => {
    const cleanup = createPlaybackCleanup();
    const remove = vi.fn();
    cleanup.cancel();
    cleanup.add(() => remove());
    expect(remove).toHaveBeenCalledOnce();
  });
});
