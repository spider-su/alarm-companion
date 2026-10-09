import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceTone = 'Gentle' | 'Cheerful' | 'Firm' | 'Playful';
export type TtsVoiceSettings = { language: string; voice?: string; tone: VoiceTone; speedOverride?: number; pitchOverride?: number };
export type VoiceRecording = { id: string; name: string; uri: string; durationSeconds: number; mimeType: string; createdAt: number };
export type VoiceProfile = { id: string; name: string; kind: 'tts' | 'recording'; tts?: TtsVoiceSettings; recordingIds?: string[] };
export type VoiceLibrary = { profiles: VoiceProfile[]; recordings: VoiceRecording[]; defaultProfileId: string };
export type TextVariant = { id: string; text: string };
const STORAGE_KEY = 'alarm-companion.voice-library.v1';
export const DEFAULT_PROFILE_ID = 'voice-default-android';
export const initialVoiceLibrary: VoiceLibrary = {
  profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Default Android voice', kind: 'tts', tts: { language: 'en-US', tone: 'Gentle' } }],
  recordings: [], defaultProfileId: DEFAULT_PROFILE_ID
};

export async function loadVoiceLibrary(): Promise<VoiceLibrary> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) { await saveVoiceLibrary(initialVoiceLibrary); return initialVoiceLibrary; }
  try {
    const parsed = JSON.parse(stored) as Partial<VoiceLibrary>;
    const profiles = Array.isArray(parsed.profiles) && parsed.profiles.length ? parsed.profiles : initialVoiceLibrary.profiles;
    const recordings = Array.isArray(parsed.recordings) ? parsed.recordings : [];
    const defaultProfileId = profiles.some((p) => p.id === parsed.defaultProfileId) ? parsed.defaultProfileId! : profiles[0]!.id;
    return { profiles, recordings, defaultProfileId };
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await saveVoiceLibrary(initialVoiceLibrary);
    return initialVoiceLibrary;
  }
}

export async function saveVoiceLibrary(library: VoiceLibrary): Promise<void> { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(library)); }

/** Converts the M1 per-routine TTS fields into shared, deduplicated profiles. */
export async function migrateRoutineVoices<T extends {
  voiceProfileId?: string; ttsOverrides?: Partial<TtsVoiceSettings>; messageVariants?: TextVariant[];
  language?: string; voice?: string; tone?: VoiceTone; speed?: number; pitch?: number; message?: string;
}>(routines: T[]): Promise<T[]> {
  const library = await loadVoiceLibrary();
  const profiles = [...library.profiles];
  const normalized = routines.map((routine) => {
    const validProfile = routine.voiceProfileId && profiles.some((profile) => profile.id === routine.voiceProfileId);
    if (validProfile) return normalizeVariants(routine);
    const settings: TtsVoiceSettings = {
      language: routine.language ?? 'en-US',
      ...(routine.voice ? { voice: routine.voice } : {}),
      tone: routine.tone ?? 'Gentle',
      ...(routine.speed !== undefined && routine.speed !== 0.9 ? { speedOverride: routine.speed } : {}),
      ...(routine.pitch !== undefined && routine.pitch !== 1 ? { pitchOverride: routine.pitch } : {})
    };
    let profile = profiles.find((item) => item.kind === 'tts' && sameSettings(item.tts ?? { language: 'en-US', tone: 'Gentle' }, settings));
    if (!profile) {
      const id = `voice-migrated-${fingerprint(settings)}`;
      profile = { id, name: `Migrated ${settings.tone} voice`, kind: 'tts', tts: settings };
      profiles.push(profile);
    }
    return normalizeVariants({ ...routine, voiceProfileId: profile.id });
  });
  if (profiles.length !== library.profiles.length) await saveVoiceLibrary({ ...library, profiles });
  const migratedDefault = normalized.find((r) => r.voiceProfileId === library.defaultProfileId);
  if (!library.profiles.some((p) => p.id === library.defaultProfileId) && migratedDefault?.voiceProfileId) {
    await saveVoiceLibrary({ ...library, profiles, defaultProfileId: migratedDefault.voiceProfileId });
  }
  return normalized.map((routine) => {
    const copy = { ...routine } as T & Record<string, unknown>;
    delete copy.language; delete copy.voice; delete copy.tone; delete copy.speed; delete copy.pitch;
    delete copy.message;
    return copy;
  });
}

function normalizeVariants<T extends { messageVariants?: TextVariant[]; message?: string }>(routine: T): T {
  if (routine.messageVariants?.length) return routine;
  return { ...routine, messageVariants: [{ id: 'message-default', text: routine.message ?? '' }] };
}

function sameSettings(a: TtsVoiceSettings, b: TtsVoiceSettings): boolean {
  return a.language === b.language && a.voice === b.voice && a.tone === b.tone && a.speedOverride === b.speedOverride && a.pitchOverride === b.pitchOverride;
}

function fingerprint(settings: TtsVoiceSettings): string {
  const key = `${settings.language}|${settings.voice ?? ''}|${settings.tone}|${settings.speedOverride ?? ''}|${settings.pitchOverride ?? ''}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

export const tonePresets: Record<VoiceTone, { rate: number; pitch: number; description: string }> = {
  Gentle: { rate: 0.88, pitch: 0.98, description: 'A slightly slower, softer speaking pace' },
  Cheerful: { rate: 1.06, pitch: 1.08, description: 'A brighter pace and pitch' },
  Firm: { rate: 1, pitch: 1, description: 'A steady, neutral pace and pitch' },
  Playful: { rate: 1.08, pitch: 1.15, description: 'A quicker pace and higher pitch' }
};

export function resolveTtsSettings(profile: VoiceProfile | undefined, overrides: Partial<TtsVoiceSettings> = {}) {
  const base = profile?.tts ?? initialVoiceLibrary.profiles[0]!.tts!;
  const settings = { ...base, ...overrides };
  const preset = tonePresets[settings.tone] ?? tonePresets.Gentle;
  return {
    language: settings.language || 'en-US', voice: settings.voice,
    rate: settings.speedOverride ?? preset.rate, pitch: settings.pitchOverride ?? preset.pitch,
    tone: settings.tone
  };
}

export function chooseTextVariant(variants: TextVariant[] | undefined, legacyMessage: string, random: () => number = Math.random): string {
  const usable = (variants ?? []).map((variant) => variant.text.trim()).filter(Boolean);
  return usable.length ? usable[Math.min(usable.length - 1, Math.floor(random() * usable.length))]! : legacyMessage;
}

export function chooseRecording<T extends { id: string }>(recordings: T[], random: () => number = Math.random): T | undefined {
  if (!recordings.length) return undefined;
  return recordings[Math.min(recordings.length - 1, Math.floor(random() * recordings.length))];
}

export function chooseAvailableRecording<T extends { id: string; uri: string }>(profile: VoiceProfile, recordings: T[], exists: (uri: string) => boolean, random: () => number = Math.random): T | undefined {
  if (profile.kind !== 'recording') return undefined;
  return chooseRecording(recordings.filter((item) => profile.recordingIds?.includes(item.id) && exists(item.uri)), random);
}
