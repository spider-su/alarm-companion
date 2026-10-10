export type PlaybackKind = 'preview' | 'sound-reminder' | 'spoken-reminder' | 'alarm';

export const playbackPriority: Record<PlaybackKind, number> = {
  preview: 0, 'sound-reminder': 1, 'spoken-reminder': 2, alarm: 3
};

export function shouldReplacePlayback(active: PlaybackKind | undefined, incoming: PlaybackKind): boolean {
  return active === undefined || playbackPriority[incoming] > playbackPriority[active];
}

export function playbackKindFor(routine: { type: string; reminderBehavior?: string }, preview = false): PlaybackKind {
  if (preview) return 'preview';
  if (routine.type === 'alarm') return 'alarm';
  return routine.reminderBehavior === 'spoken' ? 'spoken-reminder' : 'sound-reminder';
}
