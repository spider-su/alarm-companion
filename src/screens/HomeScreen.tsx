import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { loadDefaults, loadRoutines, saveRoutines, soundLabels, type Routine, type RoutineType, type SoundId } from '../data/routines';
import { loadVoiceLibrary, type VoiceLibrary, type VoiceProfile } from '../data/voices';
import { nextOccurrence } from '../data/schedule';
import { playSequence } from '../audio/sequence';
import { EVERYONE, loadAllRoutineHistory, loadCompletionHistory, loadProfiles, loadRoutineHistory, recordRoutineEvent, routinesForProfile, routineTemplates, saveProfiles, undoRoutineCompletion, type FamilyProfile, type RoutineEvent } from '../data/family';
import { achievementCatalog, motivationMessages, progressForProfile, removeDeletedProfileUnlocks, undoCompletionUnlocks, unlockEligibleAchievements } from '../data/motivation';
import { completionForOccurrence, occurrenceIdForToday } from '../data/completion';
import { consumeCompletedRoutineIds, consumeNativeRoutineEvents, dismissNativeAlarm, isNativeAlarmAndroid, openExactAlarmSettings, snoozeNativeAlarm, syncNativeRoutines } from '../native/alarmCompanion';

const blank: Routine = { id: '', name: '', type: 'alarm', time: '07:00', repeat: 'once', days: [], enabled: false, messageVariants: [{ id: 'message-default', text: 'Good morning! It is time to wake up.' }], sound: 'birds', introSeconds: 8, fadeSeconds: 30, backgroundVolume: 0.35, voiceVolume: 1, repeatVoice: false, snoozeMinutes: 9, notificationIds: [], reminderCategory: 'Custom', reminderBehavior: 'notification-only' };
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const typeNames: Record<RoutineType, string> = { alarm: 'Wake-up alarm', reminder: 'Voice reminder', sleep: 'Sleep reminder' };
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, paddingHorizontal: 20 }, header: { paddingTop: 24, paddingBottom: 18 }, eyebrow: { color: '#718075', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }, title: { color: '#18352E', fontSize: 30, fontWeight: '700', marginTop: 6 }, subtitle: { color: '#66756F', fontSize: 14, marginTop: 6 }, next: { backgroundColor: '#E7F1EB', borderRadius: 20, padding: 18, marginBottom: 18 }, nextLabel: { color: '#557467', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }, nextTime: { color: '#18352E', fontSize: 28, fontWeight: '700', marginTop: 4 }, nextName: { color: '#49645A', marginTop: 3 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, listTitle: { color: '#18352E', fontSize: 20, fontWeight: '700', marginBottom: 10 }, card: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 18, marginBottom: 11, borderWidth: 1, borderColor: '#E6ECE8' }, cardTop: { flexDirection: 'row', alignItems: 'center' }, time: { color: '#193B31', fontSize: 24, fontWeight: '700', width: 78 }, cardName: { color: '#263B34', fontSize: 16, fontWeight: '700' }, meta: { color: '#718079', fontSize: 12, marginTop: 4 }, badge: { backgroundColor: '#EEF4F0', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, marginTop: 10, alignSelf: 'flex-start' }, badgeText: { color: '#527365', fontSize: 11, fontWeight: '700' }, add: { backgroundColor: '#2D6A55', minHeight: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 17, marginTop: 7, marginBottom: 20 }, addText: { color: 'white', fontSize: 16, fontWeight: '700' }, modal: { flex: 1, backgroundColor: '#F7F9F7' }, modalHead: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E5EBE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { fontSize: 21, fontWeight: '700', color: '#18352E' }, action: { color: '#2D6A55', fontSize: 16, fontWeight: '700' }, section: { marginTop: 20, marginBottom: 7, color: '#50675D', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }, label: { color: '#354A41', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 7 }, input: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: '#20362E', backgroundColor: 'white', fontSize: 15 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'white' }, chipOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' }, chipText: { color: '#53675F', fontSize: 13 }, chipTextOn: { color: 'white' }, line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, lineLabel: { color: '#354A41', fontSize: 14 }, advanced: { padding: 13, borderRadius: 12, backgroundColor: '#EAF1EC', marginTop: 15 }, preview: { borderRadius: 13, padding: 14, backgroundColor: '#E6F0E9', marginTop: 16 }, previewText: { color: '#2D6A55', fontWeight: '700', textAlign: 'center' }, delete: { alignItems: 'center', padding: 17 }, deleteText: { color: '#A24F45', fontWeight: '700' }, active: { flex: 1, backgroundColor: '#17392F', justifyContent: 'center', alignItems: 'center', padding: 28 }, activeTime: { color: 'white', fontSize: 64, fontWeight: '300' }, activeName: { color: '#D7E9DF', fontSize: 24, fontWeight: '600', marginVertical: 12 }, activeDetail: { color: '#B5C9BE', fontSize: 16, textAlign: 'center', marginBottom: 48 }, dismiss: { backgroundColor: '#DCEBE2', borderRadius: 30, minHeight: 62, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, dismissText: { color: '#18352E', fontSize: 17, fontWeight: '700' }, snooze: { borderWidth: 1, borderColor: '#A9C1B3', borderRadius: 30, minHeight: 58, width: '100%', alignItems: 'center', justifyContent: 'center' }, snoozeText: { color: 'white', fontSize: 16, fontWeight: '700' } });

export function HomeScreen() {
  const dark = useColorScheme() === 'dark';
  const colors = dark ? { bg: '#111A17', text: '#E4EEE8' } : { bg: '#F7F9F7', text: '#18352E' };
  const [items, setItems] = useState<Routine[]>([]);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([EVERYONE]);
  const [profileFilter, setProfileFilter] = useState('everyone');
  const [templatePicker, setTemplatePicker] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [profileDrafts, setProfileDrafts] = useState<FamilyProfile[]>([]);
  const [history, setHistory] = useState<RoutineEvent[]>([]);
  const [completionEvents, setCompletionEvents] = useState<RoutineEvent[]>([]);
  const [celebration, setCelebration] = useState('');
  const completing = useRef(new Set<string>());
  const [voiceLibrary, setVoiceLibrary] = useState<VoiceLibrary | null>(null);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<Routine | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [playStatus, setPlayStatus] = useState('');
  const [stopPlayback, setStopPlayback] = useState<(() => void) | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    if (!isNativeAlarmAndroid) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        const completed = await consumeCompletedRoutineIds();
        const current = itemsRef.current;
        const reconciled = completed.length ? current.map((r) => completed.includes(r.id) ? { ...r, enabled: false, notificationIds: [] } : r) : current;
        if (completed.length) { itemsRef.current = reconciled; setItems(reconciled); await saveRoutines(reconciled); }
        await syncNativeRoutines(reconciled);
        const events = await consumeNativeRoutineEvents();
        for (const event of events) if (['triggered', 'dismissed', 'snoozed'].includes(event.type)) await recordRoutineEvent({ routineId: event.routineId, routineName: event.routineName, type: event.type as RoutineEvent['type'] }, event.at);
      })();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let mounted = true;
    const openAlarm = (data: Record<string, unknown> = {}) => {
      const routine = itemsRef.current.find((item) => item.id === data.routineId && item.type === 'alarm');
      if (!routine || !mounted) return;
      setActiveAlarm(routine);
      if (!isNativeAlarmAndroid) void recordRoutineEvent({ routineId: routine.id, routineName: routine.name, type: 'triggered' });
      void playSequence(routine, setPlayStatus).then((stop) => { if (mounted) setStopPlayback(() => stop); });
    };
    void loadRoutines().then(async (persisted) => {
      if (!mounted) return;
      let loaded = persisted;
      if (isNativeAlarmAndroid) {
        const completed = await consumeCompletedRoutineIds();
        if (completed.length) { loaded = loaded.map((r) => completed.includes(r.id) ? { ...r, enabled: false, notificationIds: [] } : r); await saveRoutines(loaded); }
        await Notifications.cancelAllScheduledNotificationsAsync();
        await syncNativeRoutines(loaded);
        const nativeEvents = await consumeNativeRoutineEvents();
        for (const event of nativeEvents) if (['triggered', 'dismissed', 'snoozed'].includes(event.type)) await recordRoutineEvent({ routineId: event.routineId, routineName: event.routineName, type: event.type as RoutineEvent['type'] }, event.at);
      }
      setItems(loaded);
      setCompletionEvents(await loadCompletionHistory());
      setFamilyProfiles(await loadProfiles());
      setVoiceLibrary(await loadVoiceLibrary());
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          openAlarm(response.notification.request.content.data);
          void Notifications.clearLastNotificationResponseAsync();
        }
      });
    });
    const received = Notifications.addNotificationReceivedListener((notification) => openAlarm(notification.request.content.data));
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => openAlarm(response.notification.request.content.data));
    return () => { mounted = false; received.remove(); tapped.remove(); void Speech.stop(); };
  }, []);
  const visibleItems = useMemo(() => routinesForProfile(items, profileFilter), [items, profileFilter]);
  const todayItems = useMemo(() => [...visibleItems].sort((a, b) => a.time.localeCompare(b.time)), [visibleItems]);
  const profileProgress = progressForProfile(completionEvents, profileFilter);
  const upcoming = useMemo(() => visibleItems.filter((r) => r.enabled).sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())[0], [visibleItems]);
  async function replaceRoutine(next: Routine) {
    if (!next.name.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time)) {
      Alert.alert('Check routine details', 'Add a name and enter the time as HH:MM (24-hour time).');
      return;
    }
    try {
      if (next.repeat === 'custom' && next.days.length === 0) throw new Error('Choose at least one repeat day.');
      if (next.id.startsWith('new-')) next = { ...next, id: next.id.replace(/^new-/, 'routine-') };
      const library = await loadVoiceLibrary();
      next = { ...next, voiceProfileId: next.voiceProfileId ?? library.defaultProfileId };
      const profile = library.profiles.find((item) => item.id === next.voiceProfileId);
      const textPresent = next.messageVariants?.some((variant) => variant.text.trim());
      if (profile?.kind === 'tts' && !textPresent) throw new Error('Add at least one text message variant.');
      if (profile?.kind === 'recording' && !profile.recordingIds?.some((id) => library.recordings.some((recording) => recording.id === id))) throw new Error('Add a voice recording or choose a text-to-speech profile.');
      if (next.enabled && Platform.OS === 'android') {
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted && !(await Notifications.requestPermissionsAsync()).granted) throw new Error('Notification permission is needed to show alarms and reminders.');
      }
      if (!isNativeAlarmAndroid) for (const id of next.notificationIds) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
      const previous = items.find((r) => r.id === next.id);
      const scheduleRevision = next.enabled && !previous?.enabled ? (previous?.scheduleRevision ?? 0) + 1 : next.scheduleRevision ?? previous?.scheduleRevision ?? 0;
      const scheduled = { ...next, scheduleRevision, familyProfileId: next.familyProfileId ?? 'everyone', notificationIds: [] };
      if (scheduled.enabled && !items.some((r) => r.id === scheduled.id && r.enabled)) void recordRoutineEvent({ routineId: scheduled.id, routineName: scheduled.name, type: 'scheduled' });
      const newItems = items.some((r) => r.id === scheduled.id) ? items.map((r) => r.id === scheduled.id ? scheduled : r) : [...items, scheduled];
      setItems(newItems); await saveRoutines(newItems);
      setVoiceLibrary(library);
      if (isNativeAlarmAndroid) {
        const capabilities = await syncNativeRoutines(newItems);
        if (scheduled.enabled && scheduled.type === 'alarm' && capabilities && !capabilities.exactAlarms) Alert.alert('Exact alarms are off', 'Android may delay this wake-up alarm. You can grant exact-alarm access in Settings.', [{ text: 'Later' }, { text: 'Open settings', onPress: () => void openExactAlarmSettings() }]);
      }
      setEditing(null);
    } catch (error) { Alert.alert('Could not schedule', error instanceof Error ? error.message : 'Please check notification settings.'); }
  }
  async function markRoutineDone(routine: Routine, occurrenceId: string) {
    if (completing.current.has(occurrenceId)) return;
    completing.current.add(occurrenceId);
    try {
      const eventProfileId = (routine.familyProfileId ?? 'everyone') === 'everyone' && profileFilter !== 'everyone' ? profileFilter : routine.familyProfileId ?? 'everyone';
      const event = await recordRoutineEvent({ routineId: routine.id, routineName: routine.name, type: 'completed', profileId: eventProfileId, occurrenceId, routineType: routine.type, routineCategory: routine.reminderCategory ?? (routine.type === 'sleep' ? 'Bedtime' : 'Custom'), routineTime: routine.time });
      if (!event) return;
      const all = await loadAllRoutineHistory();
      setCompletionEvents(all.filter((item) => item.type === 'completed' && (item.routineType === 'reminder' || item.routineType === 'sleep')));
      const newUnlocks = await unlockEligibleAchievements(event, all);
      const profile = familyProfiles.find((item) => item.id === event.profileId);
      if (profile?.motivationalFeedback !== false) {
        const language = profile?.motivationLanguage ?? 'en';
        const messages = motivationMessages[language];
        const message = messages[event.at % messages.length] ?? messages[0];
        const unlocked = newUnlocks.map((item) => achievementCatalog.find((achievement) => achievement.id === item.achievementId)?.name).filter(Boolean);
        setCelebration(unlocked.length ? `${message} Milestone unlocked: ${unlocked.join(', ')}!` : message);
        setTimeout(() => setCelebration(''), 4_000);
      }
    } finally { completing.current.delete(occurrenceId); }
  }
  async function undoRoutineDone(event: RoutineEvent) {
    const removed = await undoRoutineCompletion(event.id);
    if (!removed) return;
    const remaining = await loadAllRoutineHistory();
    await undoCompletionUnlocks(event.id, remaining);
    setCompletionEvents(remaining.filter((item) => item.type === 'completed' && (item.routineType === 'reminder' || item.routineType === 'sleep')));
    setHistory(await loadRoutineHistory());
    setCelebration('Completion undone.');
  }
  async function toggle(routine: Routine) { await replaceRoutine({ ...routine, enabled: !routine.enabled }); }
  async function remove(routine: Routine) {
    if (!isNativeAlarmAndroid) for (const id of routine.notificationIds) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    const next = items.filter((r) => r.id !== routine.id); setItems(next); await saveRoutines(next); if (isNativeAlarmAndroid) await syncNativeRoutines(next); setEditing(null);
  }
  async function preview(routine: Routine) {
    stopPlayback?.();
    try {
      const stop = await playSequence(routine, setPlayStatus);
      setStopPlayback(() => stop);
    } catch (error) { Alert.alert('Could not preview routine', error instanceof Error ? error.message : 'Check the selected voice profile and audio files.'); }
  }
  async function dismissAlarm(record = true) { if (record && activeAlarm && !isNativeAlarmAndroid) void recordRoutineEvent({ routineId: activeAlarm.id, routineName: activeAlarm.name, type: 'dismissed' }); if (activeAlarm && isNativeAlarmAndroid) { await dismissNativeAlarm(activeAlarm.id); const events = await consumeNativeRoutineEvents(); for (const event of events) await recordRoutineEvent({ routineId: event.routineId, routineName: event.routineName, type: event.type as RoutineEvent['type'] }, event.at); } stopPlayback?.(); setStopPlayback(null); setActiveAlarm(null); setPlayStatus(''); }
  async function snoozeAlarm() {
    if (!activeAlarm) return;
    if (!isNativeAlarmAndroid) void recordRoutineEvent({ routineId: activeAlarm.id, routineName: activeAlarm.name, type: 'snoozed' });
    stopPlayback?.();
    const message = activeAlarm.messageVariants?.[0]?.text ?? activeAlarm.message ?? activeAlarm.name;
    const id = isNativeAlarmAndroid ? undefined : await Notifications.scheduleNotificationAsync({ content: { title: activeAlarm.name, body: message, sound: 'default', data: { routineId: activeAlarm.id, type: activeAlarm.type } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + activeAlarm.snoozeMinutes * 60_000) } });
    if (isNativeAlarmAndroid) { await snoozeNativeAlarm(activeAlarm.id); const events = await consumeNativeRoutineEvents(); for (const event of events) await recordRoutineEvent({ routineId: event.routineId, routineName: event.routineName, type: event.type as RoutineEvent['type'] }, event.at); }
    const updated = items.map((r) => r.id === activeAlarm.id ? { ...r, notificationIds: id ? [...r.notificationIds, id] : r.notificationIds } : r);
    setItems(updated); await saveRoutines(updated);
    setActiveAlarm(null); setStopPlayback(null); setPlayStatus('');
  }
  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, { backgroundColor: colors.bg }]}>
    <View style={styles.content}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.eyebrow}>A GENTLER START</Text><Text style={[styles.title, { color: colors.text }]}>Good day, ahead.</Text><Text style={styles.subtitle}>Your routines, ready when you are.</Text></View>
        <View style={styles.next}><Text style={styles.nextLabel}>Next scheduled</Text>{upcoming ? <><Text style={styles.nextTime}>{nextOccurrence(upcoming).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.nextName}>{upcoming.name} · {typeNames[upcoming.type]}</Text></> : <Text style={[styles.nextName, { marginTop: 8 }]}>No active routines yet</Text>}</View>
        <View style={styles.row}><Text style={[styles.listTitle, { color: colors.text }]}>Today</Text><Pressable onPress={() => { void loadRoutineHistory().then(setHistory); setHistoryOpen(true); }}><Text style={styles.action}>Recent activity</Text></Pressable></View>
        <View style={styles.chips}>{familyProfiles.map((p) => <Pressable key={p.id} style={[styles.chip, profileFilter === p.id && styles.chipOn]} onPress={() => setProfileFilter(p.id)}><Text style={[styles.chipText, profileFilter === p.id && styles.chipTextOn]}>{p.name}</Text></Pressable>)}<Pressable style={styles.chip} onPress={() => { setProfileDrafts(familyProfiles.map((p) => ({ ...p }))); setProfilesOpen(true); }}><Text style={styles.chipText}>Manage</Text></Pressable></View>
        <View style={[styles.next, { padding: 13, marginBottom: 14 }]}><Text style={styles.nextLabel}>{familyProfiles.find((p) => p.id === profileFilter)?.name ?? 'Profile'} progress</Text><Text style={styles.nextName}>{profileProgress.today} completed today · {profileProgress.week} this week</Text></View>
        {celebration ? <View style={styles.preview}><Text style={styles.previewText}>{celebration}</Text></View> : null}
        {todayItems.map((r) => <Pressable key={r.id} onPress={() => { setEditing({ ...r }); setAdvanced(false); }} style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}>
          <View style={styles.cardTop}><Text style={[styles.time, dark && { color: '#D2E5D9' }]}>{r.time}</Text><View style={{ flex: 1 }}><Text style={[styles.cardName, dark && { color: '#E4EEE8' }]}>{r.name}</Text><Text style={styles.meta}>{r.type !== 'alarm' ? `${r.reminderCategory ?? 'Custom'} · ` : ''}{typeNames[r.type]} · {r.repeat === 'weekdays' ? 'Weekdays' : r.repeat === 'daily' ? 'Daily' : r.repeat === 'custom' ? 'Custom days' : 'Once'}</Text></View><Switch value={r.enabled} onValueChange={() => void toggle(r)} trackColor={{ true: '#72A18A' }} /></View>
          <View style={[styles.badge, dark && { backgroundColor: '#2C3B34' }]}><Text style={[styles.badgeText, dark && { color: '#B9D0C3' }]}>{soundLabels[r.sound]} · {voiceLibrary?.profiles.find((p) => p.id === r.voiceProfileId)?.name ?? 'Default voice'} · {familyProfiles.find((p) => p.id === (r.familyProfileId ?? 'everyone'))?.name ?? 'Everyone'}</Text></View>
          <View style={[styles.row, { marginTop: 10 }]}><Pressable onPress={() => void preview(r)}><Text style={styles.action}>Preview</Text></Pressable><Text style={styles.meta}>{r.enabled ? 'Enabled' : 'Disabled'}</Text>{r.enabled && r.type !== 'alarm' && <Pressable onPress={(event) => { event.stopPropagation(); const occurrenceId = occurrenceIdForToday(r); if (!occurrenceId) return; const done = completionForOccurrence(completionEvents, occurrenceId); if (done) void undoRoutineDone(done); else void markRoutineDone(r, occurrenceId); }}><Text style={styles.action}>{completionForOccurrence(completionEvents, occurrenceIdForToday(r)) ? 'Undo' : occurrenceIdForToday(r) ? 'Mark as Done' : ''}</Text></Pressable>}<Pressable onPress={() => void recordRoutineEvent({ routineId: r.id, routineName: r.name, type: 'skipped' })}><Text style={styles.action}>Skip today</Text></Pressable></View>
        </Pressable>)}
        {!todayItems.length && <Text style={styles.subtitle}>No upcoming enabled routines for this filter.</Text>}
        <Pressable style={styles.add} onPress={() => setTemplatePicker(true)}><Text style={styles.addText}>＋  Add routine</Text></Pressable>
        <Pressable onPress={() => void loadRoutineHistory().then(setHistory).then(() => setHistoryOpen(true))}><Text style={[styles.action, { textAlign: 'center', marginBottom: 22 }]}>View recent activity</Text></Pressable>
      </ScrollView>
      {playStatus ? <Pressable onPress={() => { stopPlayback?.(); setStopPlayback(null); setPlayStatus(''); }} style={styles.preview}><Text style={styles.previewText}>{playStatus} · Tap to stop</Text></Pressable> : null}
    </View>
    <Modal visible={templatePicker} animationType="slide" onRequestClose={() => setTemplatePicker(false)}><SafeAreaView style={styles.modal}><View style={styles.modalHead}><Pressable onPress={() => setTemplatePicker(false)}><Text style={styles.action}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Choose a template</Text><View style={{ width: 48 }} /></View><ScrollView contentContainerStyle={{ padding: 20 }}>{routineTemplates.map((template) => <Pressable key={template.id} style={styles.card} onPress={() => { void loadDefaults().then(async (defaults) => { const library = await loadVoiceLibrary(); setVoiceLibrary(library); setEditing({ ...blank, ...defaults, id: `new-${Date.now()}`, name: template.name, type: template.type, time: template.time, sound: template.sound, message: template.message, messageVariants: [{ id: 'message-default', text: template.message }], reminderBehavior: template.reminderBehavior, tone: template.tone, voiceProfileId: library.defaultProfileId, familyProfileId: 'everyone' }); setAdvanced(false); setTemplatePicker(false); }); }}><Text style={styles.cardName}>{template.name}</Text><Text style={styles.meta}>{template.time} · {typeNames[template.type]} · {soundLabels[template.sound]}</Text></Pressable>)}<Pressable style={styles.add} onPress={() => { setTemplatePicker(false); void loadDefaults().then(async (defaults) => { const library = await loadVoiceLibrary(); setVoiceLibrary(library); setEditing({ ...blank, id: `new-${Date.now()}`, ...defaults, voiceProfileId: library.defaultProfileId, familyProfileId: 'everyone' }); setAdvanced(false); }); }}><Text style={styles.addText}>Start from blank</Text></Pressable></ScrollView></SafeAreaView></Modal>
    <Modal visible={profilesOpen} animationType="slide" onRequestClose={() => setProfilesOpen(false)}><SafeAreaView style={styles.modal}><View style={styles.modalHead}><Pressable onPress={() => setProfilesOpen(false)}><Text style={styles.action}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Family profiles</Text><Pressable onPress={() => { const removedIds = familyProfiles.filter((p) => p.id !== 'everyone' && !profileDrafts.some((draft) => draft.id === p.id)).map((p) => p.id); for (const id of removedIds) void removeDeletedProfileUnlocks(id); const cleaned = profileDrafts.filter((p) => p.name.trim()); const allowed = new Set(cleaned.map((p) => p.id)); const updated = items.map((r) => allowed.has(r.familyProfileId ?? 'everyone') ? r : { ...r, familyProfileId: 'everyone' }); setFamilyProfiles(cleaned); setItems(updated); void saveProfiles(cleaned); void saveRoutines(updated); if (!allowed.has(profileFilter)) setProfileFilter('everyone'); setProfilesOpen(false); }}><Text style={styles.action}>Save</Text></Pressable></View><ScrollView contentContainerStyle={{ padding: 20 }}>{profileDrafts.map((p) => <View key={p.id} style={styles.row}><TextInput value={p.name} editable={p.id !== 'everyone'} onChangeText={(name) => setProfileDrafts(profileDrafts.map((item) => item.id === p.id ? { ...item, name } : item))} style={[styles.input, { flex: 1 }]} /><Pressable disabled={p.id === 'everyone'} onPress={() => setProfileDrafts(profileDrafts.filter((item) => item.id !== p.id))}><Text style={[styles.action, p.id === 'everyone' && { color: '#AAA' }]}>Delete</Text></Pressable></View>)}{profileDrafts.map((p) => <View key={`${p.id}-motivation`} style={{ paddingHorizontal: 4, marginBottom: 12 }}><View style={styles.row}><Text style={styles.lineLabel}>Motivation for {p.name || 'new profile'}</Text><Switch value={p.motivationalFeedback !== false} onValueChange={(value) => setProfileDrafts(profileDrafts.map((item) => item.id === p.id ? { ...item, motivationalFeedback: value } : item))} /></View><View style={styles.chips}>{(['en', 'pl'] as const).map((language) => <Pressable key={language} style={[styles.chip, (p.motivationLanguage ?? 'en') === language && styles.chipOn]} onPress={() => setProfileDrafts(profileDrafts.map((item) => item.id === p.id ? { ...item, motivationLanguage: language } : item))}><Text style={[styles.chipText, (p.motivationLanguage ?? 'en') === language && styles.chipTextOn]}>{language === 'en' ? 'English' : 'Polski'}</Text></Pressable>)}</View></View>)}<Pressable style={styles.add} onPress={() => setProfileDrafts([...profileDrafts, { id: `family-${Date.now()}`, name: '' }])}><Text style={styles.addText}>＋  Add profile</Text></Pressable><Text style={styles.meta}>Everyone is the shared label. Deleting a profile moves its routines to Everyone.</Text></ScrollView></SafeAreaView></Modal>
    <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}><SafeAreaView style={styles.modal}><View style={styles.modalHead}><Pressable onPress={() => setHistoryOpen(false)}><Text style={styles.action}>Done</Text></Pressable><Text style={styles.modalTitle}>Recent activity</Text><View style={{ width: 42 }} /></View><ScrollView contentContainerStyle={{ padding: 20 }}>{history.map((event) => <View key={event.id} style={styles.card}><Text style={styles.cardName}>{event.routineName}</Text><View style={styles.row}><Text style={styles.meta}>{event.type} · {new Date(event.at).toLocaleString()}</Text>{event.type === 'completed' && (event.routineType === 'reminder' || event.routineType === 'sleep') && <Pressable onPress={() => void undoRoutineDone(event)}><Text style={styles.action}>Undo</Text></Pressable>}</View></View>)}{!history.length && <Text style={styles.subtitle}>Routine events from the last 30 days will appear here.</Text>}</ScrollView></SafeAreaView></Modal>
    <Modal visible={editing !== null} animationType="slide" onRequestClose={() => setEditing(null)}>
      {editing && <RoutineEditor routine={editing} profiles={voiceLibrary?.profiles ?? []} familyProfiles={familyProfiles} defaultProfileId={voiceLibrary?.defaultProfileId} advanced={advanced} setAdvanced={setAdvanced} onChange={setEditing} onClose={() => setEditing(null)} onPreview={() => void preview(editing)} onSave={() => void replaceRoutine(editing)} onDelete={() => remove(editing)} />}
    </Modal>
    <Modal visible={activeAlarm !== null} animationType="fade" onRequestClose={() => void dismissAlarm()}>
      {activeAlarm && <SafeAreaView style={styles.active}><Text style={styles.activeTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.activeName}>{activeAlarm.name}</Text><Text style={styles.activeDetail}>{soundLabels[activeAlarm.sound]} is playing{playStatus ? ` · ${playStatus.toLowerCase()}` : ''}</Text><Pressable style={styles.dismiss} onPress={() => void dismissAlarm()}><Text style={styles.dismissText}>Dismiss</Text></Pressable><Pressable style={styles.snooze} onPress={() => void snoozeAlarm()}><Text style={styles.snoozeText}>Snooze · {activeAlarm.snoozeMinutes} min</Text></Pressable></SafeAreaView>}
    </Modal>
  </SafeAreaView>;
}

function RoutineEditor({ routine, profiles, familyProfiles, defaultProfileId, advanced, setAdvanced, onChange, onClose, onPreview, onSave, onDelete }: { routine: Routine; profiles: VoiceProfile[]; familyProfiles: FamilyProfile[]; defaultProfileId?: string; advanced: boolean; setAdvanced: (v: boolean) => void; onChange: (v: Routine) => void; onClose: () => void; onPreview: () => void; onSave: () => void; onDelete: () => void }) {
  const dark = useColorScheme() === 'dark';
  const set = <K extends keyof Routine>(key: K, value: Routine[K]) => onChange({ ...routine, [key]: value });
  const profile = profiles.find((item) => item.id === routine.voiceProfileId) ?? profiles.find((item) => item.id === defaultProfileId) ?? profiles[0];
  const options = (values: string[], current: string, change: (value: string) => void) => <View style={styles.chips}>{values.map((v) => <Pressable key={v} style={[styles.chip, current === v && styles.chipOn]} onPress={() => change(v)}><Text style={[styles.chipText, current === v && styles.chipTextOn]}>{v}</Text></Pressable>)}</View>;
  const soundValues: SoundId[] = ['none', 'birds', 'rain', 'ocean', 'stream', 'chime'];
  return <SafeAreaView style={[styles.modal, dark && { backgroundColor: '#111A17' }]}>
    <View style={styles.modalHead}><Pressable onPress={onClose}><Text style={styles.action}>Cancel</Text></Pressable><Text style={styles.modalTitle}>{routine.id.startsWith('new-') ? 'New routine' : 'Edit routine'}</Text><Pressable onPress={onSave}><Text style={styles.action}>Save</Text></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 35 }}>
      <Text style={[styles.section, dark && { color: '#A9C4B5' }]}>General</Text><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Name</Text><TextInput value={routine.name} onChangeText={(v) => set('name', v)} placeholder="Morning routine" placeholderTextColor={dark ? '#788981' : undefined} style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
      <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Routine type</Text>{options(['Wake-up alarm', 'Voice reminder', 'Sleep reminder'], typeNames[routine.type], (v) => onChange({ ...routine, type: v === 'Wake-up alarm' ? 'alarm' : v === 'Voice reminder' ? 'reminder' : 'sleep', ...(v === 'Sleep reminder' ? { reminderCategory: 'Bedtime' as const } : {}) }))}
      {routine.type !== 'alarm' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Reminder type</Text>{options(['School', 'Work', 'Break', 'Exercise', 'Bedtime', 'Custom'], routine.reminderCategory ?? 'Custom', (v) => set('reminderCategory', v as NonNullable<Routine['reminderCategory']>))}</>}
      {routine.type !== 'alarm' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Reminder playback</Text>{options(['Notification only', 'Notification + sound', 'Notification + spoken message'], routine.reminderBehavior === 'sound' ? 'Notification + sound' : routine.reminderBehavior === 'spoken' ? 'Notification + spoken message' : 'Notification only', (v) => set('reminderBehavior', v === 'Notification + sound' ? 'sound' : v === 'Notification + spoken message' ? 'spoken' : 'notification-only'))}</>}
      <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Time</Text><TextInput value={routine.time} onChangeText={(v) => set('time', v)} placeholder="07:00" keyboardType="numbers-and-punctuation" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} /></View><View style={{ flex: 1 }}><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Repeat</Text>{options(['Once', 'Weekdays', 'Daily', 'Custom'], routine.repeat === 'once' ? 'Once' : routine.repeat === 'weekdays' ? 'Weekdays' : routine.repeat === 'daily' ? 'Daily' : 'Custom', (v) => set('repeat', v === 'Once' ? 'once' : v === 'Weekdays' ? 'weekdays' : v === 'Daily' ? 'daily' : 'custom'))}</View></View>
      {routine.repeat === 'custom' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Days</Text><View style={styles.chips}>{weekdayNames.map((day, i) => <Pressable key={day} style={[styles.chip, routine.days.includes(i) && styles.chipOn]} onPress={() => set('days', routine.days.includes(i) ? routine.days.filter((d) => d !== i) : [...routine.days, i])}><Text style={[styles.chipText, routine.days.includes(i) && styles.chipTextOn]}>{day}</Text></Pressable>)}</View></>}
      <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Family profile</Text>{options(familyProfiles.map((p) => p.name), familyProfiles.find((p) => p.id === (routine.familyProfileId ?? 'everyone'))?.name ?? 'Everyone', (name) => { const selected = familyProfiles.find((p) => p.name === name); if (selected) set('familyProfileId', selected.id); })}
      <View style={styles.line}><Text style={styles.lineLabel}>Enabled (starts scheduling)</Text><Switch value={routine.enabled} onValueChange={(v) => set('enabled', v)} /></View>
      <Text style={[styles.section, dark && { color: '#A9C4B5' }]}>Message & voice</Text><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Voice profile</Text>{options(profiles.map((p) => p.name), profile?.name ?? '', (name) => { const selected = profiles.find((p) => p.name === name); if (selected) onChange({ ...routine, voiceProfileId: selected.id }); })}
      {profile?.kind === 'recording' ? <Text style={styles.meta}>{profile.recordingIds?.length ?? 0} clips · a random clip is selected for each playback. Manage clips in Settings → Voice Library.</Text> : <>
        {(routine.messageVariants ?? [{ id: 'message-default', text: '' }]).map((variant, index) => <View key={variant.id} style={{ marginBottom: 8 }}><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Text variant {index + 1}</Text><TextInput multiline value={variant.text} onChangeText={(v) => set('messageVariants', (routine.messageVariants ?? []).map((item) => item.id === variant.id ? { ...item, text: v } : item))} style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />{(routine.messageVariants?.length ?? 0) > 1 && <Pressable onPress={() => set('messageVariants', (routine.messageVariants ?? []).filter((item) => item.id !== variant.id))}><Text style={styles.action}>Remove message</Text></Pressable>}</View>)}
        <Pressable onPress={() => set('messageVariants', [...(routine.messageVariants ?? []), { id: `message-${Date.now()}`, text: '' }])}><Text style={styles.action}>＋ Add text variant</Text></Pressable>
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Speaking tone</Text>{options(['Gentle', 'Cheerful', 'Firm', 'Playful'], routine.ttsOverrides?.tone ?? profile?.tts?.tone ?? 'Gentle', (v) => set('ttsOverrides', { ...routine.ttsOverrides, tone: v as NonNullable<Routine['ttsOverrides']>['tone'] }))}
        <Text style={styles.meta}>Tone changes pace and pitch; it does not make TTS sound emotionally expressive.</Text>
      </>}
      {routine.type === 'sleep' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Ambient sound timer · minutes</Text>{options(['5', '15', '30', '60', 'Custom'], [5, 15, 30, 60].includes(routine.sleepTimerMinutes ?? 30) ? String(routine.sleepTimerMinutes ?? 30) : 'Custom', (v) => { if (v === 'Custom') set('sleepTimerMinutes', routine.sleepTimerMinutes ?? 45); else set('sleepTimerMinutes', Number(v)); })}{![5, 15, 30, 60].includes(routine.sleepTimerMinutes ?? 30) && <TextInput value={String(routine.sleepTimerMinutes ?? 45)} onChangeText={(v) => set('sleepTimerMinutes', Math.max(1, Math.min(180, Number(v) || 1)))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />}</>}
      <View style={styles.advanced}><Pressable onPress={() => setAdvanced(!advanced)}><Text style={styles.lineLabel}>{advanced ? '−' : '+'}  Audio options</Text></Pressable></View>
      {advanced && <><Text style={[styles.section, dark && { color: '#A9C4B5' }]}>Intro sound</Text>{options(soundValues.map((v) => soundLabels[v]), soundLabels[routine.sound], (v) => set('sound', soundValues.find((s) => soundLabels[s] === v) ?? 'none'))}
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Intro delay · seconds</Text><TextInput value={String(routine.introSeconds)} onChangeText={(v) => set('introSeconds', Math.max(0, Number(v) || 0))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Fade-in · seconds</Text><TextInput value={String(routine.fadeSeconds)} onChangeText={(v) => set('fadeSeconds', Math.max(1, Number(v) || 1))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        {profile?.kind === 'tts' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Speech speed override · blank uses tone</Text><TextInput value={routine.ttsOverrides?.speedOverride === undefined ? '' : String(routine.ttsOverrides.speedOverride)} onChangeText={(v) => set('ttsOverrides', { ...routine.ttsOverrides, speedOverride: v.trim() ? Math.max(0.5, Math.min(2, Number(v) || 1)) : undefined })} keyboardType="decimal-pad" placeholder="Use tone preset" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Pitch override · blank uses tone</Text><TextInput value={routine.ttsOverrides?.pitchOverride === undefined ? '' : String(routine.ttsOverrides.pitchOverride)} onChangeText={(v) => set('ttsOverrides', { ...routine.ttsOverrides, pitchOverride: v.trim() ? Math.max(0.5, Math.min(2, Number(v) || 1)) : undefined })} keyboardType="decimal-pad" placeholder="Use tone preset" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} /></>}
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Background volume · 0–1</Text><TextInput value={String(routine.backgroundVolume)} onChangeText={(v) => set('backgroundVolume', Math.max(0, Math.min(1, Number(v) || 0)))} keyboardType="decimal-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Voice volume · 0–1</Text><TextInput value={String(routine.voiceVolume)} onChangeText={(v) => set('voiceVolume', Math.max(0, Math.min(1, Number(v) || 0)))} keyboardType="decimal-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <View style={styles.line}><Text style={styles.lineLabel}>Repeat spoken message</Text><Switch value={routine.repeatVoice} onValueChange={(v) => set('repeatVoice', v)} /></View>
        {routine.type === 'alarm' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Snooze interval · minutes</Text><TextInput value={String(routine.snoozeMinutes)} onChangeText={(v) => set('snoozeMinutes', Math.max(1, Number(v) || 9))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} /></>}
      </>}
      <Pressable style={styles.preview} onPress={onPreview}><Text style={styles.previewText}>▶  Preview sound + voice</Text></Pressable>
      {!routine.id.startsWith('new-') && <Pressable style={styles.delete} onPress={onDelete}><Text style={styles.deleteText}>Delete routine</Text></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}
