import type { Routine } from './routines';
import type { RoutineEvent } from './family';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function occurrenceIdForToday(routine: Routine, now = new Date()): string | undefined {
  if (!routine.enabled || routine.type === 'alarm') return undefined;
  const day = now.getDay();
  const scheduledToday = routine.repeat === 'daily' || (routine.repeat === 'weekdays' && day >= 1 && day <= 5) || (routine.repeat === 'custom' && routine.days.includes(day)) || routine.repeat === 'once';
  if (!scheduledToday) return undefined;
  const [hour = 0, minute = 0] = routine.time.split(':').map(Number);
  if (hour * 60 + minute > now.getHours() * 60 + now.getMinutes()) return undefined;
  return routine.repeat === 'once' ? `${routine.id}:once:${routine.scheduleRevision ?? 0}` : `${routine.id}:${localDateKey(now)}`;
}
export function completionForOccurrence(events: RoutineEvent[], occurrenceId?: string) {
  return occurrenceId ? events.find((event) => event.type === 'completed' && event.occurrenceId === occurrenceId) : undefined;
}
