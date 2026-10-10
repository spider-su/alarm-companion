import { useEffect, useState } from 'react';
import { Alert, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges, modalSafeAreaEdges } from '../platform/safeArea';
import { initialDefaults, loadDefaults, saveDefaults, soundLabels, type RoutineDefaults, type SoundId } from '../data/routines';
import { demoRoutines } from '../data/routines';
import { playSequence } from '../audio/sequence';
import { getNativeAlarmCapabilities, isNativeAlarmAndroid, openExactAlarmSettings, openFullScreenSettings, syncNativeRoutines } from '../native/alarmCompanion';
import { VoiceLibraryScreen } from './VoiceLibraryScreen';
import { AchievementsScreen } from './AchievementsScreen';

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F7F9F7' }, content: { flex: 1, padding: 20 }, title: { color: '#18352E', fontSize: 29, fontWeight: '700', marginTop: 20 }, sub: { color: '#718079', fontSize: 14, marginTop: 7, marginBottom: 22 }, section: { color: '#557165', fontSize: 12, letterSpacing: 1.2, fontWeight: '700', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' }, card: { backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#E6ECE8', padding: 16, marginBottom: 10 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { color: '#263B34', fontSize: 15, fontWeight: '700' }, detail: { color: '#728079', fontSize: 13, lineHeight: 20, marginTop: 6 }, button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F1EB', borderRadius: 13, marginTop: 10 }, buttonText: { color: '#2D6A55', fontWeight: '700' }, foot: { color: '#87938D', fontSize: 12, lineHeight: 18, marginTop: 6 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }, choice: { borderWidth: 1, borderColor: '#DCE5DF', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8 }, choiceOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' }, choiceText: { color: '#53675F', fontSize: 12 }, choiceTextOn: { color: 'white' }, secondary: { flex: 1, backgroundColor: '#F7F9F7' }, secondaryHead: { minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E6ECE8', backgroundColor: '#F7F9F7' }, back: { minWidth: 64, minHeight: 44, justifyContent: 'center', color: '#2D6A55', fontSize: 16, fontWeight: '700' }, secondaryTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#18352E' } });

export function SettingsScreen() {
  const dark = useColorScheme() === 'dark';
  const [secondaryPage, setSecondaryPage] = useState<'voices' | 'progress' | null>(null);
  const [notificationStatus, setNotificationStatus] = useState('Checking…');
  const [voiceStatus, setVoiceStatus] = useState('Checking installed voices…');
  const [defaults, setDefaults] = useState<RoutineDefaults>(initialDefaults);
  const [alarmCapabilities, setAlarmCapabilities] = useState<{ exactAlarms: boolean; fullScreenIntent: boolean; notifications: boolean } | null>(null);
  const refresh = async () => {
    const permission = await Notifications.getPermissionsAsync();
    setNotificationStatus(permission.granted ? 'Allowed' : 'Not allowed');
    if (isNativeAlarmAndroid) setAlarmCapabilities((await getNativeAlarmCapabilities()) ?? null);
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const en = voices.some((v) => v.language.toLowerCase().startsWith('en'));
      const pl = voices.some((v) => v.language.toLowerCase().startsWith('pl'));
      setVoiceStatus(`English ${en ? 'available' : 'not found'} · Polish ${pl ? 'available' : 'not found'}`);
    } catch { setVoiceStatus('Could not read installed Android TTS voices'); }
  };
  useEffect(() => {
    void loadDefaults().then(setDefaults);
    const timer = setTimeout(() => { void refresh(); }, 0);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { clearTimeout(timer); appState.remove(); };
  }, []);
  const updateDefaults = (next: RoutineDefaults) => { setDefaults(next); void saveDefaults(next); };
  const choices = (values: string[], selected: string, onSelect: (value: string) => void) => <View style={styles.choices}>{values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceOn]}><Text style={[styles.choiceText, selected === value && styles.choiceTextOn]}>{value}</Text></Pressable>)}</View>;
  const testSequence = async () => { const routine = { ...demoRoutines[0]!, ...defaults, introSeconds: 1, fadeSeconds: 3 }; const stop = await playSequence(routine, () => undefined); setTimeout(stop, 25_000); };
  async function requestNotifications() {
    const result = await Notifications.requestPermissionsAsync();
    setNotificationStatus(result.granted ? 'Allowed' : 'Not allowed');
    if (!result.granted) Alert.alert('Notifications are off', 'Enable notifications in Android Settings to receive routine reminders.');
  }
  async function testVoice() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const selected = voices.find((v) => v.language.toLowerCase().startsWith('en'));
      const routine = { ...demoRoutines[0]!, sound: 'none' as const, introSeconds: 0, repeatVoice: false, messageVariants: [{ id: 'settings-preview', text: 'Your voice playback is ready. Have a calm and lovely day.' }], ttsOverrides: { language: selected?.language ?? 'en-US', ...(selected ? { voice: selected.identifier } : {}), tone: 'Gentle' as const } };
      const stop = await playSequence(routine, () => undefined);
      setTimeout(stop, 15_000);
    } catch { Alert.alert('Voice test failed', 'Android Text-to-Speech is unavailable.'); }
  }
  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, dark && { backgroundColor: '#111A17' }]}><ScrollView style={styles.content}>
    <Text style={[styles.title, dark && { color: '#E4EEE8' }]}>Settings</Text><Text style={styles.sub}>Simple controls for a softer start.</Text>
    <Text style={styles.section}>Permissions</Text>
    <View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><View style={styles.row}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Notifications</Text><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>{notificationStatus}</Text></View><Text style={styles.detail}>Used for scheduled routine reminders and alarm notifications.</Text><Pressable style={styles.button} onPress={() => void requestNotifications()}><Text style={styles.buttonText}>Allow notifications</Text></Pressable></View>
    <View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><View style={styles.row}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Exact alarm access</Text><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>{!isNativeAlarmAndroid ? 'Android only' : alarmCapabilities ? alarmCapabilities.exactAlarms ? 'Available' : 'Not allowed' : 'Checking…'}</Text></View><Text style={styles.detail}>Exact access lets Android deliver wake-up alarms at their scheduled time. Without it, Android may delay delivery. It is requested only when you open Android’s alarm access settings.</Text>{isNativeAlarmAndroid && <Pressable style={styles.button} onPress={() => void openExactAlarmSettings()}><Text style={styles.buttonText}>Manage exact alarm access</Text></Pressable>}</View>
    {isNativeAlarmAndroid && <View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><View style={styles.row}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Full-screen alarm</Text><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>{alarmCapabilities ? alarmCapabilities.fullScreenIntent ? 'Available' : 'Restricted' : 'Checking…'}</Text></View><Text style={styles.detail}>Android controls whether alarms can open over the lock screen. If full-screen access is unavailable, the alarm notification remains available.</Text>{!alarmCapabilities?.fullScreenIntent && <Pressable style={styles.button} onPress={() => void openFullScreenSettings()}><Text style={styles.buttonText}>Manage full-screen access</Text></Pressable>}</View>}
    <Text style={styles.section}>Voice</Text><View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Installed TTS languages</Text><Text style={styles.detail}>{voiceStatus}</Text><Pressable style={styles.button} onPress={() => void refresh()}><Text style={styles.buttonText}>Refresh voices</Text></Pressable><Pressable style={styles.button} onPress={() => void testVoice()}><Text style={styles.buttonText}>Play voice test</Text></Pressable></View>
    <Text style={styles.section}>Voice library</Text><View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Reusable voice profiles</Text><Text style={styles.detail}>Manage Android voices and private recordings. Assign a profile to each routine in its editor. TTS tone presets adjust pace and pitch; they do not add emotion or change the speaker's expression.</Text><Pressable style={styles.button} onPress={() => setSecondaryPage('voices')}><Text style={styles.buttonText}>Open Voice Library</Text></Pressable></View>
    <Text style={styles.section}>Your progress</Text><View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Milestones and encouragement</Text><Text style={styles.detail}>See recent progress and milestones for your family.</Text><Pressable style={styles.button} onPress={() => setSecondaryPage('progress')}><Text style={styles.buttonText}>View progress</Text></Pressable></View>
    <Text style={styles.section}>Defaults for new routines</Text><View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Nature sound</Text>{choices(Object.values(soundLabels), soundLabels[defaults.sound], (v) => updateDefaults({ ...defaults, sound: (Object.entries(soundLabels).find(([, label]) => label === v)?.[0] ?? 'birds') as SoundId }))}<Text style={[styles.heading, { marginTop: 14 }, dark && { color: '#E4EEE8' }]}>Fade-in · seconds</Text>{choices(['15', '30', '45', '60'], String(defaults.fadeSeconds), (v) => updateDefaults({ ...defaults, fadeSeconds: Number(v) }))}</View>
    <View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Audio sequence</Text><Text style={styles.detail}>Play a short sample using the selected defaults.</Text><Pressable style={styles.button} onPress={() => void testSequence()}><Text style={styles.buttonText}>Preview sound + voice</Text></Pressable></View>
    <Text style={styles.section}>About</Text><View style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={[styles.heading, dark && { color: '#E4EEE8' }]}>Alarm Companion</Text><Text style={styles.detail}>Version {Constants.expoConfig?.version ?? '1.0.0'} · Offline-first prototype</Text><Text style={styles.foot}>Routine settings and messages stay on this device. Voice availability depends on Android's installed TTS engine and language data.</Text></View>
    <Pressable onPress={() => void AsyncStorage.removeItem('alarm-companion.routines.v1').then(async () => { if (isNativeAlarmAndroid) await syncNativeRoutines([]); Alert.alert('Sample routines reset', 'Restart the app to restore the editable examples.'); })}><Text style={[styles.foot, { textAlign: 'center', marginVertical: 20 }]}>Reset sample routines</Text></Pressable>
  </ScrollView>
    <Modal visible={secondaryPage !== null} animationType="slide" onRequestClose={() => setSecondaryPage(null)}>
      <SafeAreaView edges={modalSafeAreaEdges} style={styles.secondary}>
        <View style={[styles.secondaryHead, dark && { backgroundColor: '#111A17', borderBottomColor: '#34463D' }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={() => setSecondaryPage(null)}><Text style={styles.back}>‹ Back</Text></Pressable>
          <Text style={[styles.secondaryTitle, dark && { color: '#E4EEE8' }]}>{secondaryPage === 'voices' ? 'Voice Library' : 'Progress'}</Text>
          <View style={{ width: 64 }} />
        </View>
        {secondaryPage === 'voices' ? <VoiceLibraryScreen embedded /> : <AchievementsScreen embedded />}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
