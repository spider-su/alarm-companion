import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadVoiceLibrary, migrateRoutineVoices, saveVoiceLibrary, type TextVariant, type TtsVoiceSettings } from './voices';

export type RoutineType = 'alarm' | 'reminder' | 'sleep';
export type ReminderBehavior = 'notification-only' | 'sound' | 'spoken';
export type ReminderCategory = 'School' | 'Work' | 'Break' | 'Exercise' | 'Bedtime' | 'Custom';
export type SoundId = 'none' | 'birds' | 'rain' | 'ocean' | 'stream' | 'chime';
export type Tone = 'Gentle' | 'Cheerful' | 'Firm' | 'Playful';
export type Routine = {
  id: string; name: string; type: RoutineType; time: string; repeat: 'once' | 'weekdays' | 'daily' | 'custom';
  days: number[]; enabled: boolean; message?: string; language?: 'en-US' | 'pl-PL'; voice?: string; tone?: Tone;
  speed?: number; pitch?: number; sound: SoundId; introSeconds: number; fadeSeconds: number;
  backgroundVolume: number; voiceVolume: number; repeatVoice: boolean; snoozeMinutes: number; notificationIds: string[];
  reminderBehavior?: ReminderBehavior;
  reminderCategory?: ReminderCategory;
  voiceProfileId?: string; ttsOverrides?: Partial<TtsVoiceSettings>; messageVariants?: TextVariant[]; previewAudioUri?: string;
  familyProfileId?: string; sleepTimerMinutes?: number;
};

const STORAGE_KEY = 'alarm-companion.routines.v1';
const DEFAULTS_KEY = 'alarm-companion.defaults.v1';
export type RoutineDefaults = { sound: SoundId; fadeSeconds: number };
export const initialDefaults: RoutineDefaults = { sound: 'birds', fadeSeconds: 30 };
export async function loadDefaults(): Promise<RoutineDefaults> {
  const value = await AsyncStorage.getItem(DEFAULTS_KEY);
  if (value) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (typeof parsed.language === 'string' || typeof parsed.voice === 'string' || typeof parsed.tone === 'string') {
        const library = await loadVoiceLibrary();
        const profiles = library.profiles.map((profile) => profile.id === library.defaultProfileId && profile.kind === 'tts' ? {
          ...profile, tts: { language: String(parsed.language ?? profile.tts?.language ?? 'en-US'), ...(typeof parsed.voice === 'string' ? { voice: parsed.voice } : {}), tone: (parsed.tone as Tone) ?? profile.tts?.tone ?? 'Gentle' }
        } : profile);
        await saveVoiceLibrary({ ...library, profiles });
      }
      return { sound: (parsed.sound as SoundId) ?? initialDefaults.sound, fadeSeconds: typeof parsed.fadeSeconds === 'number' ? parsed.fadeSeconds : initialDefaults.fadeSeconds };
    } catch { await AsyncStorage.removeItem(DEFAULTS_KEY); }
  }
  return initialDefaults;
}
export async function saveDefaults(defaults: RoutineDefaults): Promise<void> { await AsyncStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults)); }
export const demoRoutines: Routine[] = [
  make({ name: 'Good Morning', type: 'alarm', time: '07:00', repeat: 'daily', message: "Good morning! It's time to wake up. Have a wonderful day!", sound: 'birds', tone: 'Gentle', fadeSeconds: 30 }),
  make({ name: 'School Reminder', type: 'reminder', reminderCategory: 'School', time: '07:40', repeat: 'weekdays', message: "It's time to get ready for school. Don't forget your backpack!", sound: 'chime', tone: 'Cheerful' }),
  make({ name: 'Bedtime', type: 'sleep', reminderCategory: 'Bedtime', time: '20:30', repeat: 'daily', message: 'Time to get ready for bed. Sweet dreams!', sound: 'rain', tone: 'Gentle' })
];
function make(overrides: Partial<Routine>): Routine {
  return { id: `sample-${overrides.name}`, name: 'New routine', type: 'alarm', time: '07:00', repeat: 'once', days: [], enabled: false, message: 'Good morning! It is time to wake up.', language: 'en-US', tone: 'Gentle', speed: 0.9, pitch: 1, sound: 'birds', introSeconds: 8, fadeSeconds: 30, backgroundVolume: 0.35, voiceVolume: 1, repeatVoice: false, snoozeMinutes: 9, notificationIds: [], reminderBehavior: 'notification-only', reminderCategory: 'Custom', ...overrides };
}
export async function loadRoutines(): Promise<Routine[]> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  let routines = demoRoutines;
  if (value) { try { routines = JSON.parse(value) as Routine[]; } catch { await AsyncStorage.removeItem(STORAGE_KEY); } }
  const migrated = await migrateRoutineVoices(routines.map((routine) => ({ ...routine, familyProfileId: routine.familyProfileId ?? 'everyone' })));
  await saveRoutines(migrated);
  return migrated;
}
export async function saveRoutines(routines: Routine[]): Promise<void> { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routines)); }
export const soundLabels: Record<SoundId, string> = { none: 'None', birds: 'Birds', rain: 'Rain', ocean: 'Ocean', stream: 'Forest stream', chime: 'Soft chime' };
