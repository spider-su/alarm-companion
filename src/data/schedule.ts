export type RepeatRule = 'once' | 'weekdays' | 'daily' | 'custom';

/** Calculates the next occurrence in device local time, preserving wall-clock time over DST changes. */
export function nextOccurrence(routine: { time: string; repeat: RepeatRule; days: number[] }, now = new Date()): Date {
  const [hour, minute] = routine.time.split(':').map(Number);
  const candidate = new Date(now);
  candidate.setHours(hour ?? 7, minute ?? 0, 0, 0);
  if (routine.repeat === 'once') {
    if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }
  const allowed = routine.repeat === 'daily' ? [0, 1, 2, 3, 4, 5, 6]
    : routine.repeat === 'weekdays' ? [1, 2, 3, 4, 5] : routine.days;
  for (let offset = 0; offset < 8; offset++) {
    const occurrence = new Date(candidate);
    occurrence.setDate(candidate.getDate() + offset);
    if (occurrence > now && allowed.includes(occurrence.getDay())) return occurrence;
  }
  return candidate;
}

export function snoozeOccurrence(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}
