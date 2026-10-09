import { describe, expect, it, vi } from 'vitest';
import { startAfterRecordingPermission } from './recordingPermission';

describe('microphone permission handling', () => {
  it('does not start the recorder when permission is denied', async () => {
    const start = vi.fn(async () => undefined);
    await expect(startAfterRecordingPermission(async () => ({ granted: false }), start)).resolves.toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it('starts recording after permission is granted', async () => {
    const start = vi.fn(async () => undefined);
    await expect(startAfterRecordingPermission(async () => ({ granted: true }), start)).resolves.toBe(true);
    expect(start).toHaveBeenCalledOnce();
  });
});
