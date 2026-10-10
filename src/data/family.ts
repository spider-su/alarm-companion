import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'alarm-companion.family-profiles.v1';
const HISTORY_KEY = 'alarm-companion.routine-history.v1';
export type FamilyProfile = { id: string; name: string; motivationalFeedback?: boolean; motivationLanguage?: 'en' | 'pl' };
export type RoutineEventType = 'scheduled' | 'triggered' | 'dismissed' | 'snoozed' | 'completed' | 'skipped';
export type RoutineEvent = { id: string; routineId: string; routineName: string; type: RoutineEventType; at: number; profileId?: string; occurrenceId?: string; routineType?: string; routineCategory?: string; routineTime?: string };
export function routinesForProfile<T extends { familyProfileId?: string }>(routines: T[], profileId: string): T[] {
  return profileId === EVERYONE.id ? routines : routines.filter((routine) => (routine.familyProfileId ?? EVERYONE.id) === EVERYONE.id || routine.familyProfileId === profileId);
}
export function recentEvents<T extends { at: number }>(events: T[], now = Date.now()): T[] {
  const cutoff = now - 30 * 86400_000;
  return events.filter((event) => event.at >= cutoff).sort((a, b) => b.at - a.at);
}
export const EVERYONE: FamilyProfile = { id: 'everyone', name: 'Everyone' };
export const initialProfiles: FamilyProfile[] = [EVERYONE, { id: 'parent', name: 'Parent' }, { id: 'child-1', name: 'Child 1' }, { id: 'child-2', name: 'Child 2' }];
export async function loadProfiles(): Promise<FamilyProfile[]> {
  try { const raw = await AsyncStorage.getItem(PROFILE_KEY); if (!raw) { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(initialProfiles)); return initialProfiles; }
    const profiles = JSON.parse(raw) as FamilyProfile[]; return profiles.some((p) => p.id === EVERYONE.id) ? profiles : [EVERYONE, ...profiles];
  } catch { return initialProfiles; }
}
export async function saveProfiles(profiles: FamilyProfile[]) { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profiles.some((p) => p.id === EVERYONE.id) ? profiles : [EVERYONE, ...profiles])); }
export async function recordRoutineEvent(event: Omit<RoutineEvent, 'id' | 'at'>, now = Date.now()): Promise<RoutineEvent | undefined> {
  const entries = await loadAllRoutineHistory();
  if (event.type === 'completed' && event.occurrenceId && entries.some((item) => item.type === 'completed' && item.occurrenceId === event.occurrenceId)) return undefined;
  const created = { ...event, id: `event-${now}-${Math.random().toString(36).slice(2, 7)}`, at: now };
  entries.unshift(created);
  const cutoff = now - 30 * 86400_000;
  const retained = entries.filter((item) => item.type === 'completed' || item.at >= cutoff);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(retained));
  return created;
}
export async function loadAllRoutineHistory(): Promise<RoutineEvent[]> {
  try { const raw = await AsyncStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) as RoutineEvent[] : []; } catch { return []; }
}
export async function loadCompletionHistory(): Promise<RoutineEvent[]> { return (await loadAllRoutineHistory()).filter((event) => event.type === 'completed' && (event.routineType === 'reminder' || event.routineType === 'sleep')); }
export async function undoRoutineCompletion(eventId: string): Promise<RoutineEvent | undefined> {
  const entries = await loadAllRoutineHistory();
  const removed = entries.find((event) => event.id === eventId && event.type === 'completed');
  if (removed) await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries.filter((event) => event.id !== eventId)));
  return removed;
}
export async function loadRoutineHistory(now = Date.now()): Promise<RoutineEvent[]> {
  try { return recentEvents(await loadAllRoutineHistory(), now); } catch { return []; }
}
export type RoutineTemplate = { id: string; name: string; type: 'alarm' | 'reminder' | 'sleep'; sound: 'birds' | 'rain' | 'ocean' | 'chime'; time: string; message: string; reminderBehavior: 'notification-only' | 'sound' | 'spoken'; tone: 'Gentle' | 'Cheerful' };
export const routineTemplates: RoutineTemplate[] = [
  { id: 'good-morning', name: 'Good Morning', type: 'alarm', sound: 'birds', time: '07:00', message: 'Good morning! It is time to wake up.', reminderBehavior: 'spoken', tone: 'Gentle' },
  { id: 'school', name: 'Time for School', type: 'reminder', sound: 'chime', time: '07:40', message: 'It is time to get ready for school.', reminderBehavior: 'spoken', tone: 'Cheerful' },
  { id: 'work', name: 'Time for Work', type: 'reminder', sound: 'chime', time: '08:00', message: 'It is time to get ready for work.', reminderBehavior: 'spoken', tone: 'Gentle' },
  { id: 'break', name: 'Take a Break', type: 'reminder', sound: 'chime', time: '10:30', message: 'Take a moment to stretch and rest.', reminderBehavior: 'notification-only', tone: 'Gentle' },
  { id: 'homework', name: 'Homework Time', type: 'reminder', sound: 'chime', time: '16:00', message: 'It is time to focus on homework.', reminderBehavior: 'spoken', tone: 'Gentle' },
  { id: 'family', name: 'Family Time', type: 'reminder', sound: 'chime', time: '18:00', message: 'It is time for family time.', reminderBehavior: 'spoken', tone: 'Gentle' },
  { id: 'prepare-bed', name: 'Prepare for Bed', type: 'sleep', sound: 'rain', time: '20:30', message: 'Time to get ready for bed. Sweet dreams.', reminderBehavior: 'spoken', tone: 'Gentle' },
  { id: 'sleep', name: 'Sleep Time', type: 'sleep', sound: 'ocean', time: '21:00', message: 'Relax and rest well.', reminderBehavior: 'sound', tone: 'Gentle' },
];
