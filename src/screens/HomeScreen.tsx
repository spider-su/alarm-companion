import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { loadDefaults, loadRoutines, saveRoutines, soundLabels, type Routine, type RoutineType } from '../data/routines';
import { loadVoiceLibrary, type VoiceLibrary } from '../data/voices';
import { playSequence } from '../audio/sequence';
import { EVERYONE, loadAllRoutineHistory, loadCompletionHistory, loadProfiles, loadRoutineHistory, recordRoutineEvent, routineTemplates, undoRoutineCompletion, type FamilyProfile, type RoutineEvent } from '../data/family';
import { achievementCatalog, motivationMessages, undoCompletionUnlocks, unlockEligibleAchievements } from '../data/motivation';
import { completionForOccurrence, occurrenceIdForToday } from '../data/completion';
import { consumeCompletedRoutineIds, consumeNativeRoutineEvents, dismissNativeAlarm, isNativeAlarmAndroid, openExactAlarmSettings, snoozeNativeAlarm, syncNativeRoutines } from '../native/alarmCompanion';
import type { AppTabParamList } from '../navigationTypes';
import { RoutineEditor } from './RoutineEditor';

const blank: Routine = { id: '', name: '', type: 'alarm', time: '07:00', repeat: 'once', days: [], enabled: false, messageVariants: [{ id: 'message-default', text: 'Good morning! It is time to wake up.' }], sound: 'birds', introSeconds: 8, fadeSeconds: 30, backgroundVolume: 0.35, voiceVolume: 1, repeatVoice: false, snoozeMinutes: 9, notificationIds: [], reminderCategory: 'Custom', reminderBehavior: 'notification-only' };
const typeNames: Record<RoutineType, string> = { alarm: 'Wake-up alarm', reminder: 'Voice reminder', sleep: 'Sleep reminder' };
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, paddingHorizontal: 20 }, header: { paddingTop: 24, paddingBottom: 18 }, eyebrow: { color: '#718075', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }, title: { color: '#18352E', fontSize: 30, fontWeight: '700', marginTop: 6 }, subtitle: { color: '#66756F', fontSize: 14, marginTop: 6 }, next: { backgroundColor: '#E7F1EB', borderRadius: 20, padding: 18, marginBottom: 18 }, nextLabel: { color: '#557467', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }, nextTime: { color: '#18352E', fontSize: 28, fontWeight: '700', marginTop: 4 }, nextName: { color: '#49645A', marginTop: 3 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, listTitle: { color: '#18352E', fontSize: 20, fontWeight: '700', marginBottom: 10 }, card: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 18, marginBottom: 11, borderWidth: 1, borderColor: '#E6ECE8' }, cardTop: { flexDirection: 'row', alignItems: 'center' }, time: { color: '#193B31', fontSize: 24, fontWeight: '700', width: 78 }, cardName: { color: '#263B34', fontSize: 16, fontWeight: '700' }, meta: { color: '#718079', fontSize: 12, marginTop: 4 }, badge: { backgroundColor: '#EEF4F0', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, marginTop: 10, alignSelf: 'flex-start' }, badgeText: { color: '#527365', fontSize: 11, fontWeight: '700' }, add: { backgroundColor: '#2D6A55', minHeight: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 17, marginTop: 7, marginBottom: 20 }, addText: { color: 'white', fontSize: 16, fontWeight: '700' }, modal: { flex: 1, backgroundColor: '#F7F9F7' }, modalHead: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E5EBE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { fontSize: 21, fontWeight: '700', color: '#18352E' }, action: { color: '#2D6A55', fontSize: 16, fontWeight: '700' }, section: { marginTop: 20, marginBottom: 7, color: '#50675D', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }, label: { color: '#354A41', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 7 }, input: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: '#20362E', backgroundColor: 'white', fontSize: 15 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'white' }, chipOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' }, chipText: { color: '#53675F', fontSize: 13 }, chipTextOn: { color: 'white' }, line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, lineLabel: { color: '#354A41', fontSize: 14 }, advanced: { padding: 13, borderRadius: 12, backgroundColor: '#EAF1EC', marginTop: 15 }, preview: { borderRadius: 13, padding: 14, backgroundColor: '#E6F0E9', marginTop: 16 }, previewText: { color: '#2D6A55', fontWeight: '700', textAlign: 'center' }, delete: { alignItems: 'center', padding: 17 }, deleteText: { color: '#A24F45', fontWeight: '700' }, active: { flex: 1, backgroundColor: '#17392F', justifyContent: 'center', alignItems: 'center', padding: 28 }, activeTime: { color: 'white', fontSize: 64, fontWeight: '300' }, activeName: { color: '#D7E9DF', fontSize: 24, fontWeight: '600', marginVertical: 12 }, activeDetail: { color: '#B5C9BE', fontSize: 16, textAlign: 'center', marginBottom: 48 }, dismiss: { backgroundColor: '#DCEBE2', borderRadius: 30, minHeight: 62, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, dismissText: { color: '#18352E', fontSize: 17, fontWeight: '700' }, snooze: { borderWidth: 1, borderColor: '#A9C1B3', borderRadius: 30, minHeight: 58, width: '100%', alignItems: 'center', justifyContent: 'center' }, snoozeText: { color: 'white', fontSize: 16, fontWeight: '700' } });

export function RoutinesScreen() {
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const route = useRoute<RouteProp<AppTabParamList, 'Routines'>>();
  const dark = useColorScheme() === 'dark';
  const colors = dark ? { bg: '#111A17', text: '#E4EEE8' } : { bg: '#F7F9F7', text: '#18352E' };
  const [items, setItems] = useState<Routine[]>([]);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([EVERYONE]);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<RoutineEvent[]>([]);
  const [completionEvents, setCompletionEvents] = useState<RoutineEvent[]>([]);
  const [celebration, setCelebration] = useState('');
  const completing = useRef(new Set<string>());
  const [voiceLibrary, setVoiceLibrary] = useState<VoiceLibrary | null>(null);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<Routine | null>(null);
  const [newRoutineStartStep, setNewRoutineStartStep] = useState(0);
  const [playStatus, setPlayStatus] = useState('');
  const [stopPlayback, setStopPlayback] = useState<(() => void) | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useFocusEffect(useCallback(() => { let active = true; void loadProfiles().then((profiles) => { if (active) setFamilyProfiles(profiles); }); return () => { active = false; }; }, []));
  const routeEditId = route.params?.editRoutineId;
  const routeEditing = routeEditId ? items.find((item) => item.id === routeEditId) ?? null : null;
  const activeEditing = editing ?? routeEditing;
  const showTemplatePicker = templatePicker || Boolean(route.params?.createRequest);
  const closeTemplatePicker = () => { setTemplatePicker(false); navigation.setParams({ createRequest: undefined }); };
  const closeEditor = () => { setEditing(null); navigation.setParams({ editRoutineId: undefined }); };
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
  const todayItems = useMemo(() => [...items].sort((a, b) => a.time.localeCompare(b.time)), [items]);
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
      navigation.setParams({ editRoutineId: undefined });
    } catch (error) { Alert.alert('Could not schedule', error instanceof Error ? error.message : 'Please check notification settings.'); }
  }
  async function markRoutineDone(routine: Routine, occurrenceId: string) {
    if (completing.current.has(occurrenceId)) return;
    completing.current.add(occurrenceId);
    try {
      const eventProfileId = routine.familyProfileId ?? EVERYONE.id;
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
    const next = items.filter((r) => r.id !== routine.id); setItems(next); await saveRoutines(next); if (isNativeAlarmAndroid) await syncNativeRoutines(next); setEditing(null); navigation.setParams({ editRoutineId: undefined });
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
        <View style={styles.header}><Text style={styles.eyebrow}>YOUR FAMILY</Text><Text style={[styles.title, { color: colors.text }]}>Routines</Text><Text style={styles.subtitle}>Tap a routine to make a change.</Text></View>
        <View style={styles.row}><Text style={[styles.listTitle, { color: colors.text }]}>All routines</Text><Pressable accessibilityRole="button" onPress={() => { void loadRoutineHistory().then(setHistory); setHistoryOpen(true); }}><Text style={styles.action}>Activity</Text></Pressable></View>
        {celebration ? <View style={styles.preview}><Text style={styles.previewText}>{celebration}</Text></View> : null}
        {todayItems.map((r) => { const occurrenceId = occurrenceIdForToday(r); const completed = occurrenceId ? completionForOccurrence(completionEvents, occurrenceId) : undefined; return <View key={r.id} style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}>
          <View style={styles.cardTop}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${r.name}`} onPress={() => setEditing({ ...r })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 48 }}><Text style={[styles.time, dark && { color: '#D2E5D9' }]}>{r.time}</Text><View style={{ flex: 1 }}><Text style={[styles.cardName, dark && { color: '#E4EEE8' }]}>{r.name}</Text><Text style={styles.meta}>{typeNames[r.type]} · {r.repeat === 'weekdays' ? 'Weekdays' : r.repeat === 'daily' ? 'Every day' : r.repeat === 'custom' ? 'Custom days' : 'Once'}</Text></View></Pressable><Switch accessibilityLabel={`${r.enabled ? 'Turn off' : 'Turn on'} ${r.name}`} value={r.enabled} onValueChange={() => void toggle(r)} trackColor={{ true: '#72A18A' }} /></View>
          <Text style={styles.meta}>{soundLabels[r.sound]} · {voiceLibrary?.profiles.find((p) => p.id === r.voiceProfileId)?.name ?? 'Device voice'} · {familyProfiles.find((p) => p.id === (r.familyProfileId ?? EVERYONE.id))?.name ?? EVERYONE.name}</Text>
          {r.enabled && r.type !== 'alarm' && occurrenceId && <Pressable accessibilityRole="button" onPress={() => completed ? void undoRoutineDone(completed) : void markRoutineDone(r, occurrenceId)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={styles.action}>{completed ? 'Undo completion' : 'Mark done'}</Text></Pressable>}
        </View>; })}
        {!todayItems.length && <Text style={styles.subtitle}>No routines yet. Add one to get started.</Text>}
        <Pressable accessibilityRole="button" style={styles.add} onPress={() => setTemplatePicker(true)}><Text style={styles.addText}>＋  Add routine</Text></Pressable>
      </ScrollView>
      {playStatus ? <Pressable onPress={() => { stopPlayback?.(); setStopPlayback(null); setPlayStatus(''); }} style={styles.preview}><Text style={styles.previewText}>{playStatus} · Tap to stop</Text></Pressable> : null}
    </View>
    <Modal visible={showTemplatePicker} animationType="slide" onRequestClose={closeTemplatePicker}><SafeAreaView style={styles.modal}><View style={styles.modalHead}><Pressable onPress={closeTemplatePicker}><Text style={styles.action}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Choose a template</Text><View style={{ width: 48 }} /></View><ScrollView contentContainerStyle={{ padding: 20 }}>{routineTemplates.map((template) => <Pressable key={template.id} style={styles.card} onPress={() => { void loadDefaults().then(async (defaults) => { const library = await loadVoiceLibrary(); setVoiceLibrary(library); setNewRoutineStartStep(1); setEditing({ ...blank, ...defaults, id: `new-${Date.now()}`, name: template.name, type: template.type, time: template.time, sound: template.sound, message: template.message, messageVariants: [{ id: 'message-default', text: template.message }], reminderBehavior: template.reminderBehavior, tone: template.tone, voiceProfileId: library.defaultProfileId, familyProfileId: 'everyone' }); closeTemplatePicker(); }); }}><Text style={styles.cardName}>{template.name}</Text><Text style={styles.meta}>{template.time} · {typeNames[template.type]} · {soundLabels[template.sound]}</Text></Pressable>)}<Pressable style={styles.add} onPress={() => { closeTemplatePicker(); void loadDefaults().then(async (defaults) => { const library = await loadVoiceLibrary(); setVoiceLibrary(library); setNewRoutineStartStep(0); setEditing({ ...blank, id: `new-${Date.now()}`, ...defaults, voiceProfileId: library.defaultProfileId, familyProfileId: 'everyone' }); }); }}><Text style={styles.addText}>Start from blank</Text></Pressable></ScrollView></SafeAreaView></Modal>
    <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}><SafeAreaView style={styles.modal}><View style={styles.modalHead}><Pressable onPress={() => setHistoryOpen(false)}><Text style={styles.action}>Done</Text></Pressable><Text style={styles.modalTitle}>Recent activity</Text><View style={{ width: 42 }} /></View><ScrollView contentContainerStyle={{ padding: 20 }}>{history.map((event) => <View key={event.id} style={styles.card}><Text style={styles.cardName}>{event.routineName}</Text><View style={styles.row}><Text style={styles.meta}>{event.type} · {new Date(event.at).toLocaleString()}</Text>{event.type === 'completed' && (event.routineType === 'reminder' || event.routineType === 'sleep') && <Pressable onPress={() => void undoRoutineDone(event)}><Text style={styles.action}>Undo</Text></Pressable>}</View></View>)}{!history.length && <Text style={styles.subtitle}>Routine events from the last 30 days will appear here.</Text>}</ScrollView></SafeAreaView></Modal>
    <Modal visible={activeEditing !== null} animationType="slide" onRequestClose={closeEditor}>
      {activeEditing && <RoutineEditor routine={activeEditing} initialStep={activeEditing.id.startsWith('new-') ? newRoutineStartStep : undefined} profiles={voiceLibrary?.profiles ?? []} familyProfiles={familyProfiles} defaultProfileId={voiceLibrary?.defaultProfileId} onChange={setEditing} onClose={closeEditor} onPreview={() => void preview(activeEditing)} onSave={() => void replaceRoutine(activeEditing)} onDelete={() => void remove(activeEditing)} />}
    </Modal>
    <Modal visible={activeAlarm !== null} animationType="fade" onRequestClose={() => void dismissAlarm()}>
      {activeAlarm && <SafeAreaView style={styles.active}><Text style={styles.activeTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.activeName}>{activeAlarm.name}</Text><Text style={styles.activeDetail}>{soundLabels[activeAlarm.sound]} is playing{playStatus ? ` · ${playStatus.toLowerCase()}` : ''}</Text><Pressable style={styles.dismiss} onPress={() => void dismissAlarm()}><Text style={styles.dismissText}>Dismiss</Text></Pressable><Pressable style={styles.snooze} onPress={() => void snoozeAlarm()}><Text style={styles.snoozeText}>Snooze · {activeAlarm.snoozeMinutes} min</Text></Pressable></SafeAreaView>}
    </Modal>
  </SafeAreaView>;
}
