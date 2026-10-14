import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { soundLabels, type Routine, type RoutineType, type SoundId } from '../data/routines';
import type { VoiceProfile } from '../data/voices';
import type { FamilyProfile } from '../data/family';
import { applyWakeStyle, wakeStyleFor } from '../data/wakeStyle';

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const types: { value: RoutineType; title: string; detail: string; icon: string }[] = [
  { value: 'alarm', title: 'Wake up', detail: 'Start the day with a gentle alarm.', icon: '☀️' },
  { value: 'reminder', title: 'Remind me', detail: 'A helpful nudge at the right time.', icon: '🔔' },
  { value: 'sleep', title: 'Bedtime', detail: 'Wind down with a calm sound.', icon: '🌙' }
];
const typeTitle: Record<RoutineType, string> = { alarm: 'Alarm', reminder: 'Reminder', sleep: 'Bedtime' };
const typeName: Record<RoutineType, string> = { alarm: 'Wake-up alarm', reminder: 'Reminder', sleep: 'Bedtime' };
const soundValues: SoundId[] = ['none', 'birds', 'rain', 'ocean', 'stream', 'chime'];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F7' },
  head: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E5EBE7' },
  action: { color: '#2D6A55', fontSize: 16, fontWeight: '700', minWidth: 60, minHeight: 44, textAlignVertical: 'center' },
  headTitle: { fontSize: 19, fontWeight: '700', color: '#18352E' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 96 },
  progress: { color: '#648074', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  title: { color: '#18352E', fontSize: 26, fontWeight: '700', marginBottom: 6 },
  intro: { color: '#718079', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  label: { color: '#354A41', fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#E2EAE4', padding: 15, marginBottom: 10, minHeight: 70 },
  selected: { borderColor: '#2D6A55', backgroundColor: '#EAF3ED' },
  typeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { fontSize: 26 },
  name: { color: '#263B34', fontSize: 16, fontWeight: '700' },
  detail: { color: '#718079', fontSize: 13, lineHeight: 19, marginTop: 4 },
  input: { minHeight: 48, borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, color: '#20362E', backgroundColor: 'white', fontSize: 16 },
  time: { minHeight: 72, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#E7F1EB', marginBottom: 10 },
  timeText: { color: '#18352E', fontSize: 38, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, backgroundColor: 'white' },
  chipOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' },
  chipText: { color: '#53675F', fontSize: 14 },
  chipTextOn: { color: 'white', fontWeight: '700' },
  line: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { borderRadius: 16, padding: 16, backgroundColor: '#E7F1EB', marginTop: 18 },
  summaryTitle: { color: '#557467', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  summaryText: { color: '#18352E', fontSize: 16, fontWeight: '700', lineHeight: 24, marginTop: 7 },
  advanced: { borderRadius: 13, padding: 14, backgroundColor: '#EAF1EC', marginTop: 18 },
  primary: { minHeight: 54, borderRadius: 16, backgroundColor: '#2D6A55', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondary: { flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#C9D8CE', justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#2D6A55', fontSize: 16, fontWeight: '700' },
  destructive: { color: '#A24F45', fontWeight: '700', fontSize: 15, textAlign: 'center', padding: 16 },
  muted: { color: '#718079', fontSize: 13, lineHeight: 19, marginTop: 6 }
});

type Props = {
  routine: Routine;
  initialStep?: number;
  profiles: VoiceProfile[];
  familyProfiles: FamilyProfile[];
  defaultProfileId?: string;
  onChange: (routine: Routine) => void;
  onClose: () => void;
  onPreview: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function RoutineEditor({ routine, initialStep = 0, profiles, familyProfiles, defaultProfileId, onChange, onClose, onPreview, onSave, onDelete }: Props) {
  const dark = useColorScheme() === 'dark';
  const creating = routine.id.startsWith('new-');
  const [step, setStep] = useState(initialStep);
  const [advanced, setAdvanced] = useState(false);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const profile = profiles.find((item) => item.id === routine.voiceProfileId) ?? profiles.find((item) => item.id === defaultProfileId) ?? profiles[0];
  const colors = dark ? { bg: '#111A17', text: '#E4EEE8', muted: '#A8B9AF', card: '#202D27', border: '#34463D' } : { bg: '#F7F9F7', text: '#18352E', muted: '#718079', card: 'white', border: '#E2EAE4' };
  const update = <K extends keyof Routine>(key: K, value: Routine[K]) => onChange({ ...routine, [key]: value });
  const button = (label: string, selected: boolean, action: () => void, key = label) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} onPress={action} style={[styles.chip, selected && styles.chipOn, dark && { backgroundColor: selected ? '#2D6A55' : colors.card, borderColor: colors.border }]}><Text style={[styles.chipText, selected && styles.chipTextOn, dark && !selected && { color: colors.muted }]}>{label}</Text></Pressable>;
  const chooseType = (type: RoutineType) => {
    if (type === routine.type) return;
    const enabled = creating ? false : routine.enabled;
    const withMessage = (message: string) => ({ message, ...(creating ? { messageVariants: [{ id: 'message-default', text: message }] } : {}) });
    if (type === 'alarm') onChange({ ...applyWakeStyle({ ...routine, type, enabled }, 'Gentle'), ...withMessage('Good morning! It is time to wake up.') });
    else if (type === 'reminder') onChange({ ...routine, type, enabled, sound: 'chime', introSeconds: 0, fadeSeconds: 5, reminderCategory: 'Custom', reminderBehavior: 'notification-only', ...withMessage('It is time for your reminder.') });
    else onChange({ ...routine, type, enabled, sound: 'rain', introSeconds: 0, fadeSeconds: 30, sleepTimerMinutes: 30, reminderCategory: 'Bedtime', reminderBehavior: 'sound', ...withMessage('Time to get ready for bed. Sweet dreams.') });
  };
  const currentStyle = wakeStyleFor(routine, profile?.tts?.tone);
  const timeValue = () => { const [hour = '7', minute = '0'] = routine.time.split(':'); const date = new Date(); date.setHours(Number(hour), Number(minute), 0, 0); return date; };
  const openTimePicker = () => {
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: timeValue(), mode: 'time', is24Hour: true, onChange: (event, selected) => { if (event.type === 'set' && selected) update('time', `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`); } });
    else if (Platform.OS === 'ios') setShowIosPicker((visible) => !visible);
  };
  const scheduleLabel = routine.repeat === 'once' ? 'Once' : routine.repeat === 'daily' ? 'Every day' : routine.repeat === 'weekdays' ? 'Weekdays' : `Custom · ${routine.days.map((day) => weekdayNames[day]).filter(Boolean).join(', ') || 'Choose days'}`;
  const voiceName = profile?.name ?? 'Device voice';
  const familyName = familyProfiles.find((person) => person.id === (routine.familyProfileId ?? 'everyone'))?.name ?? 'Everyone';
  const summary = `${routine.name.trim() || typeName[routine.type]} — ${routine.time} — ${scheduleLabel} — ${familyName} — ${soundLabels[routine.sound]} — ${voiceName}`;
  const sectionTitle = creating ? (step === 0 ? 'What should happen?' : step === 1 ? 'When should it happen?' : 'Make it yours') : 'Edit routine';
  const canAdvance = step !== 1 || routine.repeat !== 'custom' || routine.days.length > 0;
  const advance = () => {
    if (!canAdvance) { Alert.alert('Choose days', 'Select at least one day for a custom repeat.'); return; }
    setStep(Math.min(2, step + 1));
  };
  const header = <View style={[styles.head, dark && { backgroundColor: colors.bg, borderColor: colors.border }]}><Pressable accessibilityRole="button" onPress={onClose}><Text style={[styles.action, dark && { color: '#9BC5AA' }]}>Cancel</Text></Pressable><Text style={[styles.headTitle, dark && { color: colors.text }]}>{creating ? `New ${typeTitle[routine.type].toLowerCase()}` : 'Edit routine'}</Text><View style={{ minWidth: 60 }} /></View>;

  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, dark && { backgroundColor: colors.bg }]}>
    {header}
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      {creating && <><Text style={[styles.progress, dark && { color: '#9BC5AA' }]}>STEP {step + 1} OF 3</Text><Text style={[styles.title, dark && { color: colors.text }]}>{sectionTitle}</Text></>}
      {(step === 0 || !creating) && <>
        {creating && <Text style={[styles.intro, dark && { color: colors.muted }]}>Choose a starting point. You can adjust the details next.</Text>}
        {!creating && <Text style={[styles.label, dark && { color: colors.muted }]}>Name</Text>}
        {!creating && <TextInput accessibilityLabel="Routine name" value={routine.name} onChangeText={(value) => update('name', value)} placeholder="Morning routine" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />}
        <View style={{ gap: 10 }}>{types.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: routine.type === item.value }} onPress={() => chooseType(item.value)} style={[styles.card, routine.type === item.value && styles.selected, dark && { backgroundColor: routine.type === item.value ? '#243B30' : colors.card, borderColor: routine.type === item.value ? '#72A18A' : colors.border }]}><View style={styles.typeRow}><Text style={styles.icon}>{item.icon}</Text><View style={{ flex: 1 }}><Text style={[styles.name, dark && { color: colors.text }]}>{item.title}</Text><Text style={[styles.detail, dark && { color: colors.muted }]}>{item.detail}</Text></View><Text style={{ color: routine.type === item.value ? '#2D6A55' : colors.muted }}>{routine.type === item.value ? '✓' : ''}</Text></View></Pressable>)}</View>
        {!creating && <><Text style={[styles.label, dark && { color: colors.muted }]}>Message category</Text><View style={styles.chips}>{['School', 'Work', 'Break', 'Exercise', 'Bedtime', 'Custom'].map((category) => button(category, routine.reminderCategory === category, () => update('reminderCategory', category as NonNullable<Routine['reminderCategory']>)))}</View><Text style={[styles.label, dark && { color: colors.muted }]}>Reminder behavior</Text><View style={styles.chips}>{[['Notification only', 'notification-only'], ['Sound', 'sound'], ['Spoken message', 'spoken']].map(([label, value]) => button(label!, routine.reminderBehavior === value, () => update('reminderBehavior', value as NonNullable<Routine['reminderBehavior']>)))}</View></>}
      </>}

      {(step === 1 || !creating) && <>
        {!creating && <Text style={[styles.title, dark && { color: colors.text }]}>When</Text>}
        {creating && <Text style={[styles.intro, dark && { color: colors.muted }]}>Pick a time and repeat schedule. You can change these later.</Text>}
        <Text style={[styles.label, dark && { color: colors.muted }]}>Time</Text>
        {Platform.OS === 'web' ? <TextInput accessibilityLabel="Time (24-hour HH:MM)" value={routine.time} onChangeText={(value) => update('time', value)} placeholder="07:00" keyboardType="numbers-and-punctuation" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /> : <Pressable accessibilityRole="button" accessibilityLabel={`Change time, currently ${routine.time}`} onPress={openTimePicker} style={[styles.time, dark && { backgroundColor: '#243B30' }]}><Text style={[styles.timeText, dark && { color: colors.text }]}>{routine.time}</Text><Text style={[styles.detail, dark && { color: colors.muted }]}>Tap to change time</Text></Pressable>}
        {showIosPicker && <DateTimePicker value={timeValue()} mode="time" display="spinner" onChange={(_, value) => { setShowIosPicker(false); if (value) update('time', `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`); }} />}
        <Text style={[styles.label, dark && { color: colors.muted }]}>Repeat</Text><View style={styles.chips}>{[['Once', 'once'], ['Every day', 'daily'], ['Weekdays', 'weekdays'], ['Custom', 'custom']].map(([label, value]) => button(label!, routine.repeat === value, () => update('repeat', value as Routine['repeat'])))}</View>
        {routine.repeat === 'custom' && <><Text style={[styles.label, dark && { color: colors.muted }]}>Choose days</Text><View style={styles.chips}>{weekdayNames.map((day, index) => button(day, routine.days.includes(index), () => update('days', routine.days.includes(index) ? routine.days.filter((value) => value !== index) : [...routine.days, index])))}</View></>}
        <Text style={[styles.label, dark && { color: colors.muted }]}>For</Text><View style={styles.chips}>{familyProfiles.map((person) => button(person.name, (routine.familyProfileId ?? 'everyone') === person.id, () => update('familyProfileId', person.id), person.id))}</View>
        {!creating && <View style={styles.line}><Text style={[styles.name, { fontSize: 15 }, dark && { color: colors.text }]}>Turn on this routine</Text><Switch accessibilityLabel="Turn on this routine" value={routine.enabled} onValueChange={(value) => update('enabled', value)} /></View>}
      </>}

      {(step === 2 || !creating) && <>
        {!creating && <Text style={[styles.title, dark && { color: colors.text, marginTop: 22 }]}>Personalize</Text>}
        {creating && <Text style={[styles.intro, dark && { color: colors.muted }]}>Choose what your family will hear.</Text>}
        {creating && <Text style={[styles.label, dark && { color: colors.muted }]}>Routine name</Text>}
        {creating && <TextInput accessibilityLabel="Routine name" value={routine.name} onChangeText={(value) => update('name', value)} placeholder={routine.type === 'alarm' ? 'Good Morning' : 'Reminder'} style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />}
        <Text style={[styles.label, dark && { color: colors.muted }]}>Sound</Text><View style={styles.chips}>{soundValues.map((sound) => button(soundLabels[sound], routine.sound === sound, () => update('sound', sound)))}</View>
        {routine.type === 'alarm' && <><Text style={[styles.label, dark && { color: colors.muted }]}>Wake-up style</Text><View style={styles.chips}>{(['Gentle', 'Balanced', 'Energetic'] as const).map((style) => button(style, currentStyle === style, () => onChange(applyWakeStyle(routine, style))))}{currentStyle === 'Custom' && button('Custom', true, () => undefined)}</View><Text style={[styles.muted, dark && { color: colors.muted }]}>Gentle starts with birds and raises the volume gradually.</Text></>}
        <Text style={[styles.label, dark && { color: colors.muted }]}>Voice</Text><View style={styles.chips}>{profiles.map((item) => button(item.name, item.id === (routine.voiceProfileId ?? defaultProfileId), () => update('voiceProfileId', item.id), item.id))}</View>
        {profile?.kind === 'tts' && <><Text style={[styles.label, dark && { color: colors.muted }]}>What should it say?</Text><TextInput accessibilityLabel="Spoken message" multiline value={routine.messageVariants?.[0]?.text ?? routine.message ?? ''} onChangeText={(value) => update('messageVariants', [{ id: routine.messageVariants?.[0]?.id ?? 'message-default', text: value }, ...(routine.messageVariants ?? []).slice(1)])} placeholder="Add a short message" style={[styles.input, { minHeight: 88, textAlignVertical: 'top' }, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /></>}
        {routine.type === 'sleep' && <><Text style={[styles.label, dark && { color: colors.muted }]}>Sound timer</Text><View style={styles.chips}>{[15, 30, 60].map((minutes) => button(`${minutes} min`, routine.sleepTimerMinutes === minutes, () => update('sleepTimerMinutes', minutes)))}{button('Custom', ![15, 30, 60].includes(routine.sleepTimerMinutes ?? 30), () => update('sleepTimerMinutes', routine.sleepTimerMinutes ?? 45))}</View>{![15, 30, 60].includes(routine.sleepTimerMinutes ?? 30) && <TextInput accessibilityLabel="Custom sound timer in minutes" value={String(routine.sleepTimerMinutes ?? 45)} onChangeText={(value) => update('sleepTimerMinutes', Math.max(1, Math.min(180, Number(value) || 1)))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />}</>}
        <Pressable accessibilityRole="button" style={[styles.card, { marginTop: 16, minHeight: 48 }, dark && { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPreview}><Text style={[styles.name, { color: '#2D6A55', textAlign: 'center' }]}>▶  Hear preview</Text></Pressable>
        <View style={styles.summary}><Text style={styles.summaryTitle}>Your plan</Text><Text style={styles.summaryText}>{summary}</Text>{creating && <View style={styles.line}><View style={{ flex: 1, paddingRight: 10 }}><Text style={[styles.name, { fontSize: 14 }]}>Turn on after saving</Text><Text style={styles.detail}>This alarm will stay off unless you switch it on here.</Text></View><Switch accessibilityLabel="Turn on after saving" value={routine.enabled} onValueChange={(value) => update('enabled', value)} /></View>}</View>
        <Pressable style={[styles.advanced, dark && { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityState={{ expanded: advanced }} onPress={() => setAdvanced(!advanced)}><Text style={[styles.name, { fontSize: 15 }, dark && { color: colors.text }]}>{advanced ? '− Hide advanced settings' : '+ Advanced settings'}</Text></Pressable>
        {advanced && <>
          {(routine.messageVariants?.length ?? 0) > 1 && <><Text style={[styles.label, dark && { color: colors.muted }]}>Additional spoken messages</Text>{routine.messageVariants?.slice(1).map((variant) => <View key={variant.id}><TextInput multiline accessibilityLabel="Additional spoken message" value={variant.text} onChangeText={(value) => update('messageVariants', (routine.messageVariants ?? []).map((item) => item.id === variant.id ? { ...item, text: value } : item))} style={[styles.input, { minHeight: 72, marginBottom: 8 }, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /><Pressable onPress={() => update('messageVariants', (routine.messageVariants ?? []).filter((item) => item.id !== variant.id))}><Text style={styles.action}>Remove message</Text></Pressable></View>)}</>}
          <Pressable accessibilityRole="button" onPress={() => update('messageVariants', [...(routine.messageVariants ?? [{ id: 'message-default', text: routine.message ?? '' }]), { id: `message-${Date.now()}`, text: '' }])}><Text style={[styles.action, { marginTop: 10 }]}>＋ Add another spoken message</Text></Pressable>
          <Text style={[styles.label, dark && { color: colors.muted }]}>Intro sound</Text><View style={styles.chips}>{soundValues.map((sound) => button(soundLabels[sound], routine.sound === sound, () => update('sound', sound)))}</View>
          <Text style={[styles.label, dark && { color: colors.muted }]}>Intro delay · seconds</Text><TextInput value={String(routine.introSeconds)} onChangeText={(value) => update('introSeconds', Math.max(0, Number(value) || 0))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
          <Text style={[styles.label, dark && { color: colors.muted }]}>Fade duration · seconds</Text><TextInput value={String(routine.fadeSeconds)} onChangeText={(value) => update('fadeSeconds', Math.max(1, Number(value) || 1))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
          {profile?.kind === 'tts' && <><Text style={[styles.label, dark && { color: colors.muted }]}>Speech speed · blank uses voice style</Text><TextInput value={routine.ttsOverrides?.speedOverride === undefined ? '' : String(routine.ttsOverrides.speedOverride)} onChangeText={(value) => update('ttsOverrides', { ...routine.ttsOverrides, speedOverride: value.trim() ? Math.max(0.5, Math.min(2, Number(value) || 1)) : undefined })} keyboardType="decimal-pad" placeholder="Voice style default" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /><Text style={[styles.label, dark && { color: colors.muted }]}>Pitch · blank uses voice style</Text><TextInput value={routine.ttsOverrides?.pitchOverride === undefined ? '' : String(routine.ttsOverrides.pitchOverride)} onChangeText={(value) => update('ttsOverrides', { ...routine.ttsOverrides, pitchOverride: value.trim() ? Math.max(0.5, Math.min(2, Number(value) || 1)) : undefined })} keyboardType="decimal-pad" placeholder="Voice style default" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /></>}
          <Text style={[styles.label, dark && { color: colors.muted }]}>Background volume · 0–1</Text><TextInput value={String(routine.backgroundVolume)} onChangeText={(value) => update('backgroundVolume', Math.max(0, Math.min(1, Number(value) || 0)))} keyboardType="decimal-pad" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
          <Text style={[styles.label, dark && { color: colors.muted }]}>Voice volume · 0–1</Text><TextInput value={String(routine.voiceVolume)} onChangeText={(value) => update('voiceVolume', Math.max(0, Math.min(1, Number(value) || 0)))} keyboardType="decimal-pad" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
          <View style={styles.line}><Text style={[styles.name, { fontSize: 14 }, dark && { color: colors.text }]}>Repeat spoken message</Text><Switch value={routine.repeatVoice} onValueChange={(value) => update('repeatVoice', value)} /></View>
          {routine.type === 'alarm' && <><Text style={[styles.label, dark && { color: colors.muted }]}>Snooze · minutes</Text><TextInput value={String(routine.snoozeMinutes)} onChangeText={(value) => update('snoozeMinutes', Math.max(1, Number(value) || 9))} keyboardType="number-pad" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /></>}
        </>}
        {!creating && <Pressable onPress={onDelete}><Text style={styles.destructive}>Delete routine</Text></Pressable>}
      </>}
      {creating && step < 2 && <View style={styles.footerRow}>{step > 0 && <Pressable accessibilityRole="button" style={[styles.secondary, dark && { borderColor: colors.border }]} onPress={() => setStep(step - 1)}><Text style={[styles.secondaryText, dark && { color: '#9BC5AA' }]}>Back</Text></Pressable>}<Pressable accessibilityRole="button" style={[styles.primary, { flex: 1 }]} onPress={advance}><Text style={styles.primaryText}>Continue</Text></Pressable></View>}
      {creating && step === 2 && <View style={styles.footerRow}><Pressable accessibilityRole="button" style={[styles.secondary, dark && { borderColor: colors.border }]} onPress={() => setStep(1)}><Text style={[styles.secondaryText, dark && { color: '#9BC5AA' }]}>Back</Text></Pressable><Pressable accessibilityRole="button" style={[styles.primary, { flex: 1 }]} onPress={onSave}><Text style={styles.primaryText}>Save {typeTitle[routine.type]}</Text></Pressable></View>}
      {!creating && <Pressable accessibilityRole="button" style={styles.primary} onPress={onSave}><Text style={styles.primaryText}>Save changes</Text></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}
