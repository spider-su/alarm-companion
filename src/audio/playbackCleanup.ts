export type ReleasableAudioResource = { pause: () => unknown; remove: () => unknown };

export function releaseAudioResource(resource?: ReleasableAudioResource): void {
  if (!resource) return;
  try { resource.pause(); } finally { resource.remove(); }
}

export function createPlaybackCleanup() {
  let cancelled = false;
  let disposers: Array<() => void> = [];
  return {
    add(dispose: () => void): () => void {
      if (cancelled) { dispose(); return () => undefined; }
      disposers.push(dispose);
      return () => { disposers = disposers.filter((item) => item !== dispose); };
    },
    cancel(): void {
      if (cancelled) return;
      cancelled = true;
      for (const dispose of disposers.reverse()) { try { dispose(); } catch { /* Continue releasing the remaining audio resources. */ } }
      disposers = [];
    }
  };
}
