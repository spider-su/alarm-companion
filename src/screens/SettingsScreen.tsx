import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges, modalSafeAreaEdges } from '../platform/safeArea';
import { initialDefaults, loadDefaults, saveDefaults, soundLabels, type RoutineDefaults, type SoundId, type WakeStylePreference } from '../data/routines';
import { loadVoiceLibrary, saveVoiceLibrary, type VoiceLibrary } from '../data/voices';
import { loadRoutines } from '../data/routines';
import { getNativeAlarmCapabilities, isNativeAlarmAndroid, openExactAlarmSettings, openFullScreenSettings, syncNativeRoutines } from '../native/alarmCompanion';
import { VoiceLibraryScreen } from './VoiceLibraryScreen';
import { AchievementsScreen } from './AchievementsScreen';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F7' }, content: { flex: 1, paddingHorizontal: 20, paddingBottom: 28 },
  title: { color: '#18352E', fontSize: 29, fontWeight: '700', marginTop: 20 }, subtitle: { color: '#718079', fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 12 },
  section: { color: '#557165', fontSize: 12, letterSpacing: 1.2, fontWeight: '700', marginTop: 22, marginBottom: 9, textTransform: 'uppercase' },
  card: { backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#E6ECE8', padding: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, heading: { color: '#263B34', fontSize: 16, fontWeight: '700', flex: 1 },
  status: { color: '#2D6A55', fontSize: 13, fontWeight: '700' }, detail: { color: '#718079', fontSize: 13, lineHeight: 20, marginTop: 6 },
  action: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F1EB', borderRadius: 13, marginTop: 12, paddingHorizontal: 12 },
  actionText: { color: '#2D6A55', fontWeight: '700', fontSize: 14 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#DCE5DF', borderRadius: 22, paddingHorizontal: 13, backgroundColor: 'white' },
  chipOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' }, chipText: { color: '#53675F', fontSize: 13 }, chipTextOn: { color: 'white', fontWeight: '700' },
  foot: { color: '#718079', fontSize: 12, lineHeight: 19, marginTop: 8 },
  secondary: { flex: 1, backgroundColor: '#F7F9F7' }, secondaryHead: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E6ECE8', backgroundColor: '#F7F9F7' },
  back: { minWidth: 72, minHeight: 46, justifyContent: 'center', color: '#2D6A55', fontSize: 16, fontWeight: '700' }, secondaryTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#18352E' }
});

type CapabilityState = { exactAlarms: boolean; fullScreenIntent: boolean; notifications: boolean };

export function SettingsScreen() {
  const dark = useColorScheme() === 'dark';
  const [secondaryPage, setSecondaryPage] = useState<'voices' | 'progress' | null>(null);
  const [notificationAllowed, setNotificationAllowed] = useState<boolean | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityState | null>(null);
  const [defaults, setDefaults] = useState<RoutineDefaults>(initialDefaults);
  const [library, setLibrary] = useState<VoiceLibrary | null>(null);
  const colors = dark ? { bg: '#111A17', card: '#202D27', border: '#34463D', text: '#E4EEE8', muted: '#A8B9AF' } : { bg: '#F7F9F7', card: 'white', border: '#E6ECE8', text: '#18352E', muted: '#718079' };

  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const permission = await Notifications.getPermissionsAsync().catch(() => null);
    if (permission) setNotificationAllowed(permission.granted);
    if (isNativeAlarmAndroid) setCapabilities((await getNativeAlarmCapabilities()) ?? null);
  }, []);

  useEffect(() => {
    let live = true;
    void Promise.all([loadDefaults(), loadVoiceLibrary()]).then(([savedDefaults, savedLibrary]) => {
      if (live) { setDefaults(savedDefaults); setLibrary(savedLibrary); }
    });
    const timer = setTimeout(() => { void refresh(); }, 0);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { live = false; clearTimeout(timer); listener.remove(); };
  }, [refresh]);

  const updateDefaults = (next: RoutineDefaults) => { setDefaults(next); void saveDefaults(next); };
  const choose = (values: string[], selected: string, onSelect: (value: string) => void) => <View style={styles.chips}>{values.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: selected === value }} onPress={() => onSelect(value)} style={[styles.chip, selected === value && styles.chipOn, dark && { backgroundColor: selected === value ? '#2D6A55' : colors.card, borderColor: selected === value ? '#2D6A55' : colors.border }]}><Text style={[styles.chipText, selected === value && styles.chipTextOn, dark && !selected && { color: colors.muted }]}>{value}</Text></Pressable>)}</View>;
  const cardStyle = [styles.card, dark && { backgroundColor: colors.card, borderColor: colors.border }];
  const titleStyle = [styles.heading, dark && { color: colors.text }];
  const detailStyle = [styles.detail, dark && { color: colors.muted }];
  const sectionStyle = [styles.section, dark && { color: '#9BC5AA' }];
  const statusStyle = [styles.status, dark && { color: '#9BC5AA' }];

  async function allowNotifications() {
    const result = await Notifications.requestPermissionsAsync().catch(() => null);
    const allowed = result?.granted ?? false;
    setNotificationAllowed(allowed);
    if (!allowed) Alert.alert('Notifications are still off', 'You can allow them in this app’s phone settings.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => void Linking.openSettings() }]);
  }

  async function chooseDefaultVoice(profileId: string) {
    if (!library) return;
    const next = { ...library, defaultProfileId: profileId };
    setLibrary(next);
    await saveVoiceLibrary(next);
    await syncNativeRoutines(await loadRoutines());
  }

  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, dark && { backgroundColor: colors.bg }]}><ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
    <Text style={[styles.title, dark && { color: colors.text }]}>Settings</Text>
    <Text style={[styles.subtitle, dark && { color: colors.muted }]}>A few simple choices for your family’s alarms.</Text>

    <Text style={sectionStyle}>Notifications and alarms</Text>
    {Platform.OS === 'web' ? <View style={cardStyle}><Text style={titleStyle}>Use the Android app for reliable alarms</Text><Text style={detailStyle}>A browser can pause in the background or close. Browser notifications are not a dependable replacement for a wake-up alarm.</Text></View> : <>
      <View style={cardStyle}><View style={styles.row}><Text style={titleStyle}>Notifications</Text><Text style={statusStyle}>{notificationAllowed === null ? 'Checking' : notificationAllowed ? 'Allowed' : 'Needs attention'}</Text></View><Text style={detailStyle}>Notifications let you know when a reminder or alarm is due.</Text>{notificationAllowed === false && <Pressable accessibilityRole="button" style={styles.action} onPress={() => void allowNotifications()}><Text style={styles.actionText}>Allow notifications</Text></Pressable>}</View>
      {isNativeAlarmAndroid && <>
        <View style={cardStyle}><View style={styles.row}><Text style={titleStyle}>Precise alarms</Text><Text style={statusStyle}>{capabilities ? capabilities.exactAlarms ? 'Available' : 'Needs attention' : 'Checking'}</Text></View><Text style={detailStyle}>Without this access, Android may deliver a wake-up alarm later than planned.</Text>{capabilities && !capabilities.exactAlarms && <Pressable accessibilityRole="button" style={styles.action} onPress={() => void openExactAlarmSettings()}><Text style={styles.actionText}>Allow precise alarms</Text></Pressable>}</View>
        <View style={cardStyle}><View style={styles.row}><Text style={titleStyle}>Lock-screen alerts</Text><Text style={statusStyle}>{capabilities ? capabilities.fullScreenIntent ? 'Available' : 'Limited' : 'Checking'}</Text></View><Text style={detailStyle}>If alerts cannot open over the lock screen, the alarm remains available as a notification.</Text>{capabilities && !capabilities.fullScreenIntent && <Pressable accessibilityRole="button" style={styles.action} onPress={() => void openFullScreenSettings()}><Text style={styles.actionText}>Allow lock-screen alerts</Text></Pressable>}</View>
      </>}
    </>}

    <Text style={sectionStyle}>Sounds and voices</Text>
    <View style={cardStyle}><Text style={titleStyle}>Default voice</Text><Text style={detailStyle}>Used when you create a new routine. You can choose a different voice for any routine.</Text>{Platform.OS === 'web' ? <Text style={detailStyle}>Choose family recordings and installed device voices in the Android app. Browser voices vary by device.</Text> : library ? <View style={styles.chips}>{library.profiles.map((profile) => <Pressable key={profile.id} accessibilityRole="radio" accessibilityState={{ checked: profile.id === library.defaultProfileId }} onPress={() => void chooseDefaultVoice(profile.id)} style={[styles.chip, profile.id === library.defaultProfileId && styles.chipOn, dark && { backgroundColor: profile.id === library.defaultProfileId ? '#2D6A55' : colors.card, borderColor: profile.id === library.defaultProfileId ? '#2D6A55' : colors.border }]}><Text style={[styles.chipText, profile.id === library.defaultProfileId && styles.chipTextOn, dark && profile.id !== library.defaultProfileId && { color: colors.muted }]}>{profile.name}</Text></Pressable>)}</View> : <Text style={detailStyle}>Loading voices…</Text>}</View>
    <View style={cardStyle}><Text style={titleStyle}>Default wake-up style</Text><Text style={detailStyle}>Gentle brings up the sound gradually. Custom keeps existing sound and fade defaults.</Text>{choose(['Gentle', 'Balanced', 'Energetic', 'Custom'], defaults.wakeStyle, (value) => updateDefaults({ ...defaults, wakeStyle: value as WakeStylePreference }))}</View>
    {defaults.wakeStyle === 'Custom' && <View style={cardStyle}><Text style={titleStyle}>Default nature sound</Text><Text style={detailStyle}>Used with your existing custom fade settings.</Text>{choose(Object.values(soundLabels), soundLabels[defaults.sound], (value) => { const sound = (Object.entries(soundLabels).find(([, label]) => label === value)?.[0] ?? 'birds') as SoundId; updateDefaults({ ...defaults, sound }); })}</View>}
    <View style={cardStyle}><Text style={titleStyle}>Voice library</Text><Text style={detailStyle}>Choose a familiar device voice or manage private family recordings.</Text><Pressable accessibilityRole="button" style={styles.action} onPress={() => setSecondaryPage('voices')}><Text style={styles.actionText}>Open Voice Library</Text></Pressable></View>

    <Text style={sectionStyle}>Progress</Text>
    <View style={cardStyle}><Text style={titleStyle}>Milestones and encouragement</Text><Text style={detailStyle}>See your family’s recent progress.</Text><Pressable accessibilityRole="button" style={styles.action} onPress={() => setSecondaryPage('progress')}><Text style={styles.actionText}>View progress</Text></Pressable></View>

    <Text style={sectionStyle}>About</Text>
    <View style={cardStyle}><Text style={titleStyle}>Alarm Companion</Text><Text style={detailStyle}>Version {Constants.expoConfig?.version ?? '1.0.0'} · Offline-first</Text><Text style={detailStyle}>Routines and voice recordings stay in this app’s local storage. Device voice availability depends on installed speech voices. Browser alarms may not run reliably in the background.</Text></View>

    </ScrollView>
    <Modal visible={secondaryPage !== null} animationType="slide" onRequestClose={() => setSecondaryPage(null)}>
      <SafeAreaView edges={modalSafeAreaEdges} style={[styles.secondary, dark && { backgroundColor: colors.bg }]}>
        <View style={[styles.secondaryHead, dark && { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={() => setSecondaryPage(null)}><Text style={[styles.back, dark && { color: '#9BC5AA' }]}>‹ Back</Text></Pressable>
          <Text style={[styles.secondaryTitle, dark && { color: colors.text }]}>{secondaryPage === 'voices' ? 'Voice Library' : 'Progress'}</Text>
          <View style={{ width: 72 }} />
        </View>
        {secondaryPage === 'voices' ? <VoiceLibraryScreen embedded /> : <AchievementsScreen embedded />}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
