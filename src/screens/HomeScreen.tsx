import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { loadDefaults, loadRoutines, saveRoutines, soundLabels, type Routine, type RoutineType, type SoundId, type Tone } from '../data/routines';
import { nextOccurrence } from '../data/schedule';
import { playSequence } from '../audio/sequence';

const blank: Routine = { id: '', name: '', type: 'alarm', time: '07:00', repeat: 'once', days: [], enabled: false, message: 'Good morning! It is time to wake up.', language: 'en-US', tone: 'Gentle', speed: 0.9, pitch: 1, sound: 'birds', introSeconds: 8, fadeSeconds: 30, backgroundVolume: 0.35, voiceVolume: 1, repeatVoice: false, snoozeMinutes: 9, notificationIds: [] };
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const typeNames: Record<RoutineType, string> = { alarm: 'Wake-up alarm', reminder: 'Voice reminder', sleep: 'Sleep reminder' };
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flex: 1, paddingHorizontal: 20 }, header: { paddingTop: 24, paddingBottom: 18 }, eyebrow: { color: '#718075', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }, title: { color: '#18352E', fontSize: 30, fontWeight: '700', marginTop: 6 }, subtitle: { color: '#66756F', fontSize: 14, marginTop: 6 }, next: { backgroundColor: '#E7F1EB', borderRadius: 20, padding: 18, marginBottom: 18 }, nextLabel: { color: '#557467', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }, nextTime: { color: '#18352E', fontSize: 28, fontWeight: '700', marginTop: 4 }, nextName: { color: '#49645A', marginTop: 3 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, listTitle: { color: '#18352E', fontSize: 20, fontWeight: '700', marginBottom: 10 }, card: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 18, marginBottom: 11, borderWidth: 1, borderColor: '#E6ECE8' }, cardTop: { flexDirection: 'row', alignItems: 'center' }, time: { color: '#193B31', fontSize: 24, fontWeight: '700', width: 78 }, cardName: { color: '#263B34', fontSize: 16, fontWeight: '700' }, meta: { color: '#718079', fontSize: 12, marginTop: 4 }, badge: { backgroundColor: '#EEF4F0', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, marginTop: 10, alignSelf: 'flex-start' }, badgeText: { color: '#527365', fontSize: 11, fontWeight: '700' }, add: { backgroundColor: '#2D6A55', minHeight: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 17, marginTop: 7, marginBottom: 20 }, addText: { color: 'white', fontSize: 16, fontWeight: '700' }, modal: { flex: 1, backgroundColor: '#F7F9F7' }, modalHead: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E5EBE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { fontSize: 21, fontWeight: '700', color: '#18352E' }, action: { color: '#2D6A55', fontSize: 16, fontWeight: '700' }, section: { marginTop: 20, marginBottom: 7, color: '#50675D', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }, label: { color: '#354A41', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 7 }, input: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: '#20362E', backgroundColor: 'white', fontSize: 15 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'white' }, chipOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' }, chipText: { color: '#53675F', fontSize: 13 }, chipTextOn: { color: 'white' }, line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, lineLabel: { color: '#354A41', fontSize: 14 }, advanced: { padding: 13, borderRadius: 12, backgroundColor: '#EAF1EC', marginTop: 15 }, preview: { borderRadius: 13, padding: 14, backgroundColor: '#E6F0E9', marginTop: 16 }, previewText: { color: '#2D6A55', fontWeight: '700', textAlign: 'center' }, delete: { alignItems: 'center', padding: 17 }, deleteText: { color: '#A24F45', fontWeight: '700' }, active: { flex: 1, backgroundColor: '#17392F', justifyContent: 'center', alignItems: 'center', padding: 28 }, activeTime: { color: 'white', fontSize: 64, fontWeight: '300' }, activeName: { color: '#D7E9DF', fontSize: 24, fontWeight: '600', marginVertical: 12 }, activeDetail: { color: '#B5C9BE', fontSize: 16, textAlign: 'center', marginBottom: 48 }, dismiss: { backgroundColor: '#DCEBE2', borderRadius: 30, minHeight: 62, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, dismissText: { color: '#18352E', fontSize: 17, fontWeight: '700' }, snooze: { borderWidth: 1, borderColor: '#A9C1B3', borderRadius: 30, minHeight: 58, width: '100%', alignItems: 'center', justifyContent: 'center' }, snoozeText: { color: 'white', fontSize: 16, fontWeight: '700' } });

function scheduleTrigger(r: Routine) {
  const date = nextOccurrence(r);
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date } as Notifications.DateTriggerInput;
}
async function scheduleRoutine(r: Routine): Promise<Routine> {
  if (!r.enabled) return { ...r, notificationIds: [] };
  const permission = await Notifications.getPermissionsAsync();
  const granted = permission.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) throw new Error('Notification permission is needed to schedule this routine.');
  const triggers: Notifications.NotificationTriggerInput[] = r.repeat === 'once'
    ? [scheduleTrigger(r)]
    : (r.repeat === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : r.repeat === 'weekdays' ? [1, 2, 3, 4, 5] : r.days)
      .map((day) => ({ type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour: Number(r.time.split(':')[0]), minute: Number(r.time.split(':')[1]) }));
  if (triggers.length === 0) throw new Error('Choose at least one repeat day.');
  const ids: string[] = [];
  for (const trigger of triggers) ids.push(await Notifications.scheduleNotificationAsync({ content: { title: r.name, body: r.message, sound: 'default', data: { routineId: r.id, type: r.type } }, trigger }));
  return { ...r, notificationIds: ids };
}

export function HomeScreen() {
  const dark = useColorScheme() === 'dark';
  const colors = dark ? { bg: '#111A17', text: '#E4EEE8' } : { bg: '#F7F9F7', text: '#18352E' };
  const [items, setItems] = useState<Routine[]>([]);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<Routine | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [playStatus, setPlayStatus] = useState('');
  const [stopPlayback, setStopPlayback] = useState<(() => void) | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    let mounted = true;
    const openAlarm = (data: Record<string, unknown> = {}) => {
      const routine = itemsRef.current.find((item) => item.id === data.routineId && item.type === 'alarm');
      if (!routine || !mounted) return;
      setActiveAlarm(routine);
      void playSequence(routine, setPlayStatus).then((stop) => { if (mounted) setStopPlayback(() => stop); });
    };
    void loadRoutines().then((loaded) => {
      if (!mounted) return;
      setItems(loaded);
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
  const upcoming = useMemo(() => items.filter((r) => r.enabled).sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())[0], [items]);
  async function replaceRoutine(next: Routine) {
    if (!next.name.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time) || !next.message.trim()) {
      Alert.alert('Check routine details', 'Add a name and message, and enter the time as HH:MM (24-hour time).');
      return;
    }
    try {
      if (next.id.startsWith('new-')) next = { ...next, id: next.id.replace(/^new-/, 'routine-') };
      for (const id of next.notificationIds) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
      const scheduled = next.enabled ? await scheduleRoutine({ ...next, notificationIds: [] }) : { ...next, notificationIds: [] };
      const newItems = items.some((r) => r.id === scheduled.id) ? items.map((r) => r.id === scheduled.id ? scheduled : r) : [...items, scheduled];
      setItems(newItems); await saveRoutines(newItems); setEditing(null);
    } catch (error) { Alert.alert('Could not schedule', error instanceof Error ? error.message : 'Please check notification settings.'); }
  }
  async function toggle(routine: Routine) { await replaceRoutine({ ...routine, enabled: !routine.enabled }); }
  async function remove(routine: Routine) {
    for (const id of routine.notificationIds) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    const next = items.filter((r) => r.id !== routine.id); setItems(next); await saveRoutines(next); setEditing(null);
  }
  async function preview(routine: Routine) {
    stopPlayback?.();
    const stop = await playSequence(routine, setPlayStatus);
    setStopPlayback(() => stop);
  }
  async function dismissAlarm() { stopPlayback?.(); setStopPlayback(null); setActiveAlarm(null); setPlayStatus(''); }
  async function snoozeAlarm() {
    if (!activeAlarm) return;
    stopPlayback?.();
    const id = await Notifications.scheduleNotificationAsync({ content: { title: activeAlarm.name, body: activeAlarm.message, sound: 'default', data: { routineId: activeAlarm.id, type: activeAlarm.type } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + activeAlarm.snoozeMinutes * 60_000) } });
    const updated = items.map((r) => r.id === activeAlarm.id ? { ...r, notificationIds: [...r.notificationIds, id] } : r);
    setItems(updated); await saveRoutines(updated);
    setActiveAlarm(null); setStopPlayback(null); setPlayStatus('');
  }
  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, { backgroundColor: colors.bg }]}>
    <View style={styles.content}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.eyebrow}>A GENTLER START</Text><Text style={[styles.title, { color: colors.text }]}>Good day, ahead.</Text><Text style={styles.subtitle}>Your routines, ready when you are.</Text></View>
        <View style={styles.next}><Text style={styles.nextLabel}>Next scheduled</Text>{upcoming ? <><Text style={styles.nextTime}>{nextOccurrence(upcoming).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.nextName}>{upcoming.name} · {typeNames[upcoming.type]}</Text></> : <Text style={[styles.nextName, { marginTop: 8 }]}>No active routines yet</Text>}</View>
        <View style={styles.row}><Text style={[styles.listTitle, { color: colors.text }]}>Your routines</Text><Text style={styles.meta}>{items.length} total</Text></View>
        {items.map((r) => <Pressable key={r.id} onPress={() => { setEditing({ ...r }); setAdvanced(false); }} style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}>
          <View style={styles.cardTop}><Text style={[styles.time, dark && { color: '#D2E5D9' }]}>{r.time}</Text><View style={{ flex: 1 }}><Text style={[styles.cardName, dark && { color: '#E4EEE8' }]}>{r.name}</Text><Text style={styles.meta}>{typeNames[r.type]} · {r.repeat === 'weekdays' ? 'Weekdays' : r.repeat === 'daily' ? 'Daily' : r.repeat === 'custom' ? 'Custom days' : 'Once'}</Text></View><Switch value={r.enabled} onValueChange={() => void toggle(r)} trackColor={{ true: '#72A18A' }} /></View>
          <View style={[styles.badge, dark && { backgroundColor: '#2C3B34' }]}><Text style={[styles.badgeText, dark && { color: '#B9D0C3' }]}>{soundLabels[r.sound]} · {r.tone} voice</Text></View>
        </Pressable>)}
        <Pressable style={styles.add} onPress={() => { void loadDefaults().then((defaults) => { setEditing({ ...blank, id: `new-${Date.now()}`, ...defaults }); setAdvanced(false); }); }}><Text style={styles.addText}>＋  Add routine</Text></Pressable>
      </ScrollView>
      {playStatus ? <Pressable onPress={() => { stopPlayback?.(); setStopPlayback(null); setPlayStatus(''); }} style={styles.preview}><Text style={styles.previewText}>{playStatus} · Tap to stop</Text></Pressable> : null}
    </View>
    <Modal visible={editing !== null} animationType="slide" onRequestClose={() => setEditing(null)}>
      {editing && <RoutineEditor routine={editing} advanced={advanced} setAdvanced={setAdvanced} onChange={setEditing} onClose={() => setEditing(null)} onPreview={() => void preview(editing)} onSave={() => void replaceRoutine(editing)} onDelete={() => remove(editing)} />}
    </Modal>
    <Modal visible={activeAlarm !== null} animationType="fade" onRequestClose={() => void dismissAlarm()}>
      {activeAlarm && <SafeAreaView style={styles.active}><Text style={styles.activeTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.activeName}>{activeAlarm.name}</Text><Text style={styles.activeDetail}>{soundLabels[activeAlarm.sound]} is playing{playStatus ? ` · ${playStatus.toLowerCase()}` : ''}</Text><Pressable style={styles.dismiss} onPress={() => void dismissAlarm()}><Text style={styles.dismissText}>Dismiss</Text></Pressable><Pressable style={styles.snooze} onPress={() => void snoozeAlarm()}><Text style={styles.snoozeText}>Snooze · {activeAlarm.snoozeMinutes} min</Text></Pressable></SafeAreaView>}
    </Modal>
  </SafeAreaView>;
}

function RoutineEditor({ routine, advanced, setAdvanced, onChange, onClose, onPreview, onSave, onDelete }: { routine: Routine; advanced: boolean; setAdvanced: (v: boolean) => void; onChange: (v: Routine) => void; onClose: () => void; onPreview: () => void; onSave: () => void; onDelete: () => void }) {
  const dark = useColorScheme() === 'dark';
  const set = <K extends keyof Routine>(key: K, value: Routine[K]) => onChange({ ...routine, [key]: value });
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  useEffect(() => { void Speech.getAvailableVoicesAsync().then(setVoices).catch(() => undefined); }, []);
  const options = (values: string[], current: string, change: (value: string) => void) => <View style={styles.chips}>{values.map((v) => <Pressable key={v} style={[styles.chip, current === v && styles.chipOn]} onPress={() => change(v)}><Text style={[styles.chipText, current === v && styles.chipTextOn]}>{v}</Text></Pressable>)}</View>;
  const soundValues: SoundId[] = ['none', 'birds', 'rain', 'ocean', 'stream', 'chime'];
  return <SafeAreaView style={[styles.modal, dark && { backgroundColor: '#111A17' }]}>
    <View style={styles.modalHead}><Pressable onPress={onClose}><Text style={styles.action}>Cancel</Text></Pressable><Text style={styles.modalTitle}>{routine.id.startsWith('routine-') ? 'New routine' : 'Edit routine'}</Text><Pressable onPress={onSave}><Text style={styles.action}>Save</Text></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 35 }}>
      <Text style={[styles.section, dark && { color: '#A9C4B5' }]}>General</Text><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Name</Text><TextInput value={routine.name} onChangeText={(v) => set('name', v)} placeholder="Morning routine" placeholderTextColor={dark ? '#788981' : undefined} style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
      <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Routine type</Text>{options(['Wake-up alarm', 'Voice reminder', 'Sleep reminder'], typeNames[routine.type], (v) => set('type', v === 'Wake-up alarm' ? 'alarm' : v === 'Voice reminder' ? 'reminder' : 'sleep'))}
      <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Time</Text><TextInput value={routine.time} onChangeText={(v) => set('time', v)} placeholder="07:00" keyboardType="numbers-and-punctuation" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} /></View><View style={{ flex: 1 }}><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Repeat</Text>{options(['Once', 'Weekdays', 'Daily', 'Custom'], routine.repeat === 'once' ? 'Once' : routine.repeat === 'weekdays' ? 'Weekdays' : routine.repeat === 'daily' ? 'Daily' : 'Custom', (v) => set('repeat', v === 'Once' ? 'once' : v === 'Weekdays' ? 'weekdays' : v === 'Daily' ? 'daily' : 'custom'))}</View></View>
      {routine.repeat === 'custom' && <><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Days</Text><View style={styles.chips}>{weekdayNames.map((day, i) => <Pressable key={day} style={[styles.chip, routine.days.includes(i) && styles.chipOn]} onPress={() => set('days', routine.days.includes(i) ? routine.days.filter((d) => d !== i) : [...routine.days, i])}><Text style={[styles.chipText, routine.days.includes(i) && styles.chipTextOn]}>{day}</Text></Pressable>)}</View></>}
      <View style={styles.line}><Text style={styles.lineLabel}>Enabled (starts scheduling)</Text><Switch value={routine.enabled} onValueChange={(v) => set('enabled', v)} /></View>
      <Text style={[styles.section, dark && { color: '#A9C4B5' }]}>Message & voice</Text><Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Spoken message</Text><TextInput multiline value={routine.message} onChangeText={(v) => set('message', v)} style={[styles.input, { minHeight: 88, textAlignVertical: 'top' }, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
      <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Language</Text>{options(['English', 'Polski'], routine.language === 'en-US' ? 'English' : 'Polski', (v) => set('language', v === 'Polski' ? 'pl-PL' : 'en-US'))}
      <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Installed voice</Text><View style={styles.chips}><Pressable style={[styles.chip, !routine.voice && styles.chipOn]} onPress={() => set('voice', undefined)}><Text style={[styles.chipText, !routine.voice && styles.chipTextOn]}>System default</Text></Pressable>{voices.filter((v) => v.language.toLowerCase().startsWith(routine.language.slice(0, 2))).slice(0, 6).map((v) => <Pressable key={v.identifier} style={[styles.chip, routine.voice === v.identifier && styles.chipOn]} onPress={() => set('voice', v.identifier)}><Text style={[styles.chipText, routine.voice === v.identifier && styles.chipTextOn]}>{v.name}</Text></Pressable>)}</View>
      <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Speaking tone</Text>{options(['Gentle', 'Cheerful', 'Firm', 'Playful'], routine.tone, (v) => set('tone', v as Tone))}
      <View style={styles.advanced}><Pressable onPress={() => setAdvanced(!advanced)}><Text style={styles.lineLabel}>{advanced ? '−' : '+'}  Audio options</Text></Pressable></View>
      {advanced && <><Text style={[styles.section, dark && { color: '#A9C4B5' }]}>Intro sound</Text>{options(soundValues.map((v) => soundLabels[v]), soundLabels[routine.sound], (v) => set('sound', soundValues.find((s) => soundLabels[s] === v) ?? 'none'))}
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Intro delay · seconds</Text><TextInput value={String(routine.introSeconds)} onChangeText={(v) => set('introSeconds', Math.max(0, Number(v) || 0))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Fade-in · seconds</Text><TextInput value={String(routine.fadeSeconds)} onChangeText={(v) => set('fadeSeconds', Math.max(1, Number(v) || 1))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Speech speed · 0.5–2.0</Text><TextInput value={String(routine.speed)} onChangeText={(v) => set('speed', Math.max(0.5, Math.min(2, Number(v) || 1)))} keyboardType="decimal-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
        <Text style={[styles.label, dark && { color: '#C5D6CC' }]}>Pitch · 0.5–2.0</Text><TextInput value={String(routine.pitch)} onChangeText={(v) => set('pitch', Math.max(0.5, Math.min(2, Number(v) || 1)))} keyboardType="decimal-pad" style={[styles.input, dark && { backgroundColor: '#202D27', borderColor: '#34463D', color: '#E4EEE8' }]} />
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
