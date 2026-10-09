import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { Routine } from '../data/routines';
import { loadVoiceLibrary, resolveTtsSettings } from '../data/voices';

type Capabilities = { exactAlarms: boolean; fullScreenIntent: boolean; notifications: boolean };
type NativeAlarmCompanion = {
  syncRoutines(json: string): Promise<Capabilities>;
  getCapabilities(): Promise<Capabilities>;
  openExactAlarmSettings(): Promise<void>;
  openFullScreenSettings(): Promise<void>;
  previewRoutine(json: string): Promise<boolean>;
  stopPlayback(): Promise<void>;
  dismissAlarm(id: string): Promise<void>;
  snoozeAlarm(id: string): Promise<void>;
  consumeCompletedRoutineIds(): Promise<string[]>;
};

function module(): NativeAlarmCompanion | undefined {
  if (Platform.OS !== 'android') return undefined;
  return requireNativeModule<NativeAlarmCompanion>('AlarmCompanion');
}

export const isNativeAlarmAndroid = Platform.OS === 'android';
async function enrich(routine: Routine) {
  const library = await loadVoiceLibrary();
  const profile = library.profiles.find((item) => item.id === (routine.voiceProfileId ?? library.defaultProfileId));
  return { ...routine, voiceProfile: profile, recordings: profile?.recordingIds?.map((id) => library.recordings.find((item) => item.id === id)).filter(Boolean), speechConfig: resolveTtsSettings(profile, routine.ttsOverrides) };
}
export async function syncNativeRoutines(routines: Routine[]) { return module()?.syncRoutines(JSON.stringify(await Promise.all(routines.map(enrich)))); }
export async function getNativeAlarmCapabilities() { return module()?.getCapabilities(); }
export async function openExactAlarmSettings() { return module()?.openExactAlarmSettings(); }
export async function openFullScreenSettings() { return module()?.openFullScreenSettings(); }
export async function previewNativeRoutine(routine: Routine) { return module()?.previewRoutine(JSON.stringify(await enrich(routine))); }
export async function stopNativePlayback() { return module()?.stopPlayback(); }
export async function dismissNativeAlarm(id: string) { return module()?.dismissAlarm(id); }
export async function snoozeNativeAlarm(id: string) { return module()?.snoozeAlarm(id); }
export async function consumeCompletedRoutineIds() { return (await module()?.consumeCompletedRoutineIds()) ?? []; }
