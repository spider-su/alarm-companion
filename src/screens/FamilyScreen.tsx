import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { EVERYONE, loadProfiles, saveProfiles, type FamilyProfile } from '../data/family';
import { removeDeletedProfileUnlocks } from '../data/motivation';
import { loadRoutines, saveRoutines } from '../data/routines';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F7' },
  content: { padding: 20, paddingBottom: 36 },
  title: { color: '#18352E', fontSize: 29, fontWeight: '700', marginTop: 12 },
  subtitle: { color: '#718079', fontSize: 15, lineHeight: 22, marginTop: 7, marginBottom: 18 },
  card: { backgroundColor: 'white', borderColor: '#E6ECE8', borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: '#DCE5DF', borderRadius: 12, backgroundColor: 'white', color: '#20362E', paddingHorizontal: 12, fontSize: 16 },
  name: { color: '#263B34', fontSize: 17, fontWeight: '700' },
  detail: { color: '#718079', fontSize: 13, lineHeight: 19, marginTop: 5 },
  label: { color: '#354A41', fontSize: 14, flex: 1 },
  secondary: { color: '#A24F45', minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { minHeight: 42, borderWidth: 1, borderColor: '#DCE5DF', borderRadius: 22, paddingHorizontal: 15, justifyContent: 'center' },
  chipOn: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' },
  chipText: { color: '#53675F', fontWeight: '600' },
  chipTextOn: { color: 'white' },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  add: { backgroundColor: '#E7F1EB' },
  save: { backgroundColor: '#2D6A55', marginTop: 18 },
  buttonText: { color: '#2D6A55', fontSize: 15, fontWeight: '700' },
  saveText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

export function FamilyScreen() {
  const dark = useColorScheme() === 'dark';
  const [profiles, setProfiles] = useState<FamilyProfile[]>([EVERYONE]);
  const [drafts, setDrafts] = useState<FamilyProfile[]>([EVERYONE]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void loadProfiles().then((loaded) => { if (active) { setProfiles(loaded); setDrafts(loaded.map((profile) => ({ ...profile }))); } });
    return () => { active = false; };
  }, []));

  const update = (id: string, change: Partial<FamilyProfile>) => setDrafts((current) => current.map((profile) => profile.id === id ? { ...profile, ...change } : profile));
  const save = async () => {
    const cleaned = drafts.map((profile) => ({ ...profile, name: profile.id === EVERYONE.id ? EVERYONE.name : profile.name.trim() })).filter((profile) => profile.name);
    const removedIds = profiles.filter((profile) => profile.id !== EVERYONE.id && !cleaned.some((draft) => draft.id === profile.id)).map((profile) => profile.id);
    for (const id of removedIds) await removeDeletedProfileUnlocks(id);
    const allowed = new Set(cleaned.map((profile) => profile.id));
    const routines = await loadRoutines();
    const reassigned = routines.map((routine) => allowed.has(routine.familyProfileId ?? EVERYONE.id) ? routine : { ...routine, familyProfileId: EVERYONE.id });
    await Promise.all([saveProfiles(cleaned), saveRoutines(reassigned)]);
    setProfiles(cleaned);
    setDrafts(cleaned.map((profile) => ({ ...profile })));
    Alert.alert('Family saved', 'Your family and routine assignments are up to date.');
  };
  const add = () => setDrafts((current) => [...current, { id: `family-${Date.now()}`, name: '' }]);
  const textColor = dark ? '#E4EEE8' : '#18352E';

  return <SafeAreaView edges={appSafeAreaEdges} style={[styles.safe, dark && { backgroundColor: '#111A17' }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: textColor }]}>Family</Text>
      <Text style={styles.subtitle}>Give everyone a name so routines are easy to recognize.</Text>
      {drafts.map((profile) => <View key={profile.id} style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}>
        <View style={styles.row}>
          {profile.id === EVERYONE.id ? <View style={{ flex: 1, paddingVertical: 12 }}><Text style={[styles.name, dark && { color: '#E4EEE8' }]}>Everyone</Text><Text style={styles.detail}>Shared family routines</Text></View> : <TextInput accessibilityLabel="Family member name" value={profile.name} onChangeText={(name) => update(profile.id, { name })} placeholder="Family member name" style={[styles.input, dark && { backgroundColor: '#111A17', borderColor: '#34463D', color: '#E4EEE8' }]} />}
          {profile.id !== EVERYONE.id && <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${profile.name || 'family member'}`} onPress={() => setDrafts((current) => current.filter((item) => item.id !== profile.id))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.secondary}>Remove</Text></Pressable>}
        </View>
        <View style={[styles.row, { marginTop: 10 }]}><Text style={[styles.label, dark && { color: '#D5E2DA' }]}>Encouraging messages</Text><Switch accessibilityLabel={`Encouraging messages for ${profile.name || 'family member'}`} value={profile.motivationalFeedback !== false} onValueChange={(value) => update(profile.id, { motivationalFeedback: value })} /></View>
        <View style={styles.chipRow}>{(['en', 'pl'] as const).map((language) => <Pressable key={language} accessibilityRole="radio" accessibilityState={{ selected: (profile.motivationLanguage ?? 'en') === language }} style={[styles.chip, (profile.motivationLanguage ?? 'en') === language && styles.chipOn]} onPress={() => update(profile.id, { motivationLanguage: language })}><Text style={[styles.chipText, (profile.motivationLanguage ?? 'en') === language && styles.chipTextOn]}>{language === 'en' ? 'English' : 'Polski'}</Text></Pressable>)}</View>
      </View>)}
      <Pressable accessibilityRole="button" style={[styles.button, styles.add]} onPress={add}><Text style={styles.buttonText}>＋  Add family member</Text></Pressable>
      <Text style={[styles.detail, { marginTop: 12 }]}>Removing someone moves their routines to Everyone.</Text>
      <Pressable accessibilityRole="button" style={[styles.button, styles.save]} onPress={() => void save()}><Text style={styles.saveText}>Save family</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
