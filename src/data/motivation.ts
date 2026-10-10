import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoutineEvent } from './family';

const UNLOCKS_KEY = 'alarm-companion.achievement-unlocks.v1';
export type Achievement = { id: string; name: string; icon: string; description: string };
export type AchievementUnlock = { achievementId: string; profileId: string; unlockedAt: number; triggeringEventId: string };
export const achievementCatalog: Achievement[] = [
  { id: 'first-step', name: 'First Step', icon: '🌱', description: 'Complete your first routine.' },
  { id: 'getting-started', name: 'Getting Started', icon: '✨', description: 'Complete 5 routines.' },
  { id: 'great-week', name: 'Great Week', icon: '🌼', description: 'Complete 7 routines in one week.' },
  { id: 'morning-helper', name: 'Morning Helper', icon: '🌅', description: 'Complete 5 morning routines.' },
  { id: 'homework-hero', name: 'Homework Hero', icon: '📚', description: 'Complete 10 homework routines.' },
  { id: 'bedtime-star', name: 'Bedtime Star', icon: '🌙', description: 'Complete 10 bedtime routines.' },
  { id: 'routine-explorer', name: 'Routine Explorer', icon: '🧭', description: 'Complete routines from 3 categories.' },
];
export const motivationMessages = {
  en: ['Great job!', 'You did it!', 'Another step forward!', 'Nice work today!'],
  pl: ['Świetna robota!', 'Udało się!', 'Kolejny krok naprzód!', 'Dobra robota dzisiaj!'],
} as const;
function startOfLocalDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); }
export function startOfLocalWeek(date: Date) {
  const day = new Date(startOfLocalDay(date));
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day.getTime();
}
export function profileCompletions(events: RoutineEvent[], profileId: string): RoutineEvent[] {
  return events.filter((event) => event.type === 'completed' && (event.routineType === 'reminder' || event.routineType === 'sleep') && (event.profileId ?? 'everyone') === profileId);
}
export function progressForProfile(events: RoutineEvent[], profileId: string, now = new Date()) {
  const completed = profileCompletions(events, profileId);
  const dayStart = startOfLocalDay(now);
  const weekStart = startOfLocalWeek(now);
  return { today: completed.filter((event) => event.at >= dayStart).length, week: completed.filter((event) => event.at >= weekStart).length };
}
export function eligibleAchievementIds(events: RoutineEvent[], profileId: string, now = new Date()): string[] {
  const asOf = now.getTime();
  const completed = profileCompletions(events, profileId).filter((event) => event.at <= asOf);
  const week = completed.filter((event) => event.at >= startOfLocalWeek(now));
  const countName = (pattern: RegExp) => completed.filter((event) => pattern.test(`${event.routineName} ${event.routineCategory ?? ''}`)).length;
  const categories = new Set(completed.map((event) => event.routineCategory).filter((value): value is string => Boolean(value)));
  return achievementCatalog.filter((achievement) => {
    switch (achievement.id) {
      case 'first-step': return completed.length >= 1;
      case 'getting-started': return completed.length >= 5;
      case 'great-week': return week.length >= 7;
      case 'morning-helper': return completed.filter((event) => Number(event.routineTime?.slice(0, 2)) < 12).length >= 5;
      case 'homework-hero': return countName(/homework/i) >= 10;
      case 'bedtime-star': return countName(/bedtime|prepare for bed|sleep time/i) >= 10;
      case 'routine-explorer': return categories.size >= 3;
      default: return false;
    }
  }).map((achievement) => achievement.id);
}
export async function loadAchievementUnlocks(): Promise<AchievementUnlock[]> {
  try { const raw = await AsyncStorage.getItem(UNLOCKS_KEY); return raw ? JSON.parse(raw) as AchievementUnlock[] : []; } catch { return []; }
}
export async function unlockEligibleAchievements(event: RoutineEvent, events: RoutineEvent[]): Promise<AchievementUnlock[]> {
  if (event.type !== 'completed' || (event.routineType !== 'reminder' && event.routineType !== 'sleep')) return [];
  const existing = await loadAchievementUnlocks();
  const existingKeys = new Set(existing.map((item) => `${item.profileId}:${item.achievementId}`));
  const fresh = eligibleAchievementIds(events, event.profileId ?? 'everyone', new Date(event.at))
    .filter((id) => !existingKeys.has(`${event.profileId ?? 'everyone'}:${id}`))
    .map((achievementId) => ({ achievementId, profileId: event.profileId ?? 'everyone', unlockedAt: event.at, triggeringEventId: event.id }));
  if (fresh.length) await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify([...existing, ...fresh]));
  return fresh;
}
export async function recoverAchievementUnlocks(events: RoutineEvent[], profileIds: string[]): Promise<AchievementUnlock[]> {
  const existing = await loadAchievementUnlocks();
  const keys = new Set(existing.map((item) => `${item.profileId}:${item.achievementId}`));
  const activeProfiles = new Set(profileIds);
  const supported = events.filter((event) => event.type === 'completed' && (event.routineType === 'reminder' || event.routineType === 'sleep')).sort((a, b) => a.at - b.at);
  const recovered: AchievementUnlock[] = [];
  for (const event of supported) {
    const profileId = event.profileId ?? 'everyone';
    if (!activeProfiles.has(profileId)) continue;
    const eligible = eligibleAchievementIds(supported.filter((item) => item.at <= event.at), profileId, new Date(event.at));
    for (const achievementId of eligible) {
      const key = `${profileId}:${achievementId}`;
      if (keys.has(key)) continue;
      keys.add(key);
      recovered.push({ achievementId, profileId, unlockedAt: event.at, triggeringEventId: event.id });
    }
  }
  if (recovered.length) await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify([...existing, ...recovered]));
  return [...existing, ...recovered];
}
export async function undoCompletionUnlocks(eventId: string, eventsAfterUndo?: RoutineEvent[]): Promise<void> {
  const unlocks = await loadAchievementUnlocks();
  const kept = unlocks.filter((unlock) => unlock.triggeringEventId !== eventId && (!eventsAfterUndo || eligibleAchievementIds(eventsAfterUndo, unlock.profileId, new Date(unlock.unlockedAt)).includes(unlock.achievementId)));
  if (kept.length !== unlocks.length) await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify(kept));
}
export async function removeDeletedProfileUnlocks(profileId: string): Promise<void> {
  const unlocks = await loadAchievementUnlocks();
  const kept = unlocks.filter((unlock) => unlock.profileId !== profileId);
  if (kept.length !== unlocks.length) await AsyncStorage.setItem(UNLOCKS_KEY, JSON.stringify(kept));
}
