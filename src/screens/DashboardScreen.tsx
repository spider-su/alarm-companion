import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { loadRoutines, soundLabels, type Routine } from '../data/routines';
import { nextOccurrence } from '../data/schedule';
import { loadProfiles, EVERYONE, type FamilyProfile } from '../data/family';
import { loadVoiceLibrary, type VoiceLibrary } from '../data/voices';
import type { AppTabParamList } from '../navigationTypes';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  greeting: { fontSize: 14, fontWeight: '600', color: '#648073' },
  title: { fontSize: 30, fontWeight: '700', marginTop: 5 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#718079', marginTop: 7, marginBottom: 22 },
  next: { backgroundColor: '#E7F1EB', borderRadius: 22, padding: 20, marginBottom: 26 },
  nextLabel: { fontSize: 13, fontWeight: '700', color: '#557467' },
  time: { fontSize: 46, fontWeight: '700', color: '#18352E', marginTop: 7 },
  name: { fontSize: 17, fontWeight: '700', color: '#263B34', marginTop: 2 },
  detail: { fontSize: 13, color: '#648073', marginTop: 6 },
  section: { fontSize: 20, fontWeight: '700', color: '#18352E', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E6ECE8' },
  rowTime: { fontSize: 17, fontWeight: '700', color: '#315849', width: 64 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#263B34' },
  rowDetail: { fontSize: 12, color: '#718079', marginTop: 3 },
  add: { minHeight: 54, borderRadius: 17, backgroundColor: '#2D6A55', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  addText: { color: 'white', fontSize: 16, fontWeight: '700' },
  empty: { paddingVertical: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#18352E' },
  emptyText: { fontSize: 15, lineHeight: 22, color: '#718079', marginTop: 7 },
});

function scheduledToday(routine: Routine, now: Date) {
  if (!routine.enabled) return false;
  const day = now.getDay();
  if (routine.repeat === 'weekdays' && (day === 0 || day === 6)) return false;
  if (routine.repeat === 'custom' && !routine.days.includes(day)) return false;
  if (routine.repeat === 'once' && routine.time < now.toTimeString().slice(0, 5)) return false;
  return true;
}

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const dark = useColorScheme() === 'dark';
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [profiles, setProfiles] = useState<FamilyProfile[]>([EVERYONE]);
  const [voices, setVoices] = useState<VoiceLibrary | null>(null);
  const createRequest = useRef(0);
  useFocusEffect(useCallback(() => {
    let current = true;
    void Promise.all([loadRoutines(), loadProfiles(), loadVoiceLibrary()]).then(([loaded, family, library]) => { if (current) { setRoutines(loaded); setProfiles(family); setVoices(library); } });
    return () => { current = false; };
  }, []));

  const now = new Date();
  const enabled = routines.filter((routine) => routine.enabled);
  const next = [...enabled].sort((a, b) => nextOccurrence(a, now).getTime() - nextOccurrence(b, now).getTime())[0];
  const today = routines.filter((routine) => scheduledToday(routine, now)).sort((a, b) => a.time.localeCompare(b.time));
  const openCreate = () => { createRequest.current += 1; navigation.navigate('Routines', { createRequest: createRequest.current }); };
  const openRoutine = (routine: Routine) => navigation.navigate('Routines', { editRoutineId: routine.id });
  const textColor = dark ? '#E4EEE8' : '#18352E';

  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, { backgroundColor: dark ? '#111A17' : '#F7F9F7' }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>A little more ease for your day</Text>
      <Text style={[styles.title, { color: textColor }]}>Good morning</Text>
      <Text style={styles.subtitle}>Your family’s alarms and reminders, at a glance.</Text>
      {!enabled.length ? <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: textColor }]}>Nothing is turned on yet</Text>
        <Text style={styles.emptyText}>Choose when an alarm should happen and what your family will hear.</Text>
        <Pressable accessibilityRole="button" style={styles.add} onPress={openCreate}><Text style={styles.addText}>Create an alarm</Text></Pressable>
      </View> : <>
        <Pressable accessibilityRole="button" accessibilityLabel={next ? `Edit ${next.name}, ${next.time}` : 'Add your first alarm'} onPress={() => next ? openRoutine(next) : openCreate()} style={[styles.next, dark && { backgroundColor: '#23372E' }]}>
          <Text style={styles.nextLabel}>UP NEXT</Text>
          {next ? <><Text style={[styles.time, dark && { color: '#E4EEE8' }]}>{nextOccurrence(next, now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text><Text style={[styles.name, dark && { color: '#E4EEE8' }]}>{next.name}</Text><Text style={styles.detail}>{next.repeat === 'weekdays' ? 'Weekdays' : next.repeat === 'daily' ? 'Every day' : next.repeat === 'custom' ? 'Custom days' : 'Once'} · {soundLabels[next.sound]}</Text><Text style={styles.detail}>{voices?.profiles.find((profile) => profile.id === next.voiceProfileId)?.name ?? 'Device voice'} · {profiles.find((profile) => profile.id === (next.familyProfileId ?? EVERYONE.id))?.name ?? EVERYONE.name}</Text></> : <Text style={[styles.name, { marginTop: 8 }, dark && { color: '#E4EEE8' }]}>No active alarms yet</Text>}
        </Pressable>
        <Text style={[styles.section, { color: textColor }]}>Today</Text>
        {today.length ? today.map((routine) => <Pressable key={routine.id} accessibilityRole="button" onPress={() => openRoutine(routine)} style={styles.row}>
          <Text style={styles.rowTime}>{routine.time}</Text>
          <View style={{ flex: 1 }}><Text style={[styles.rowName, dark && { color: '#E4EEE8' }]}>{routine.name}</Text><Text style={styles.rowDetail}>{routine.type === 'alarm' ? 'Wake-up alarm' : routine.type === 'sleep' ? 'Bedtime' : 'Reminder'} · {profiles.find((profile) => profile.id === (routine.familyProfileId ?? EVERYONE.id))?.name ?? EVERYONE.name}</Text></View>
          <Text style={{ color: '#648073', fontSize: 20 }}>›</Text>
        </Pressable>) : <Text style={styles.emptyText}>Nothing else scheduled for today.</Text>}
        <Pressable accessibilityRole="button" style={styles.add} onPress={openCreate}><Text style={styles.addText}>＋  Add alarm or reminder</Text></Pressable>
      </>}
    </ScrollView>
  </SafeAreaView>;
}
