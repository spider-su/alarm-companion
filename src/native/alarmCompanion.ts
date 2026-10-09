import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { Routine } from '../data/routines';

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
export async function syncNativeRoutines(routines: Routine[]) { return module()?.syncRoutines(JSON.stringify(routines)); }
export async function getNativeAlarmCapabilities() { return module()?.getCapabilities(); }
export async function openExactAlarmSettings() { return module()?.openExactAlarmSettings(); }
export async function openFullScreenSettings() { return module()?.openFullScreenSettings(); }
export async function previewNativeRoutine(routine: Routine) { return module()?.previewRoutine(JSON.stringify(routine)); }
export async function stopNativePlayback() { return module()?.stopPlayback(); }
export async function dismissNativeAlarm(id: string) { return module()?.dismissAlarm(id); }
export async function snoozeNativeAlarm(id: string) { return module()?.snoozeAlarm(id); }
export async function consumeCompletedRoutineIds() { return (await module()?.consumeCompletedRoutineIds()) ?? []; }
