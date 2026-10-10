import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { EVERYONE, loadCompletionHistory, loadProfiles, type FamilyProfile, type RoutineEvent } from '../data/family';
import { achievementCatalog, progressForProfile, recoverAchievementUnlocks, type AchievementUnlock } from '../data/motivation';

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F7F9F7' }, content: { padding: 20, paddingBottom: 36 }, title: { color: '#18352E', fontSize: 28, fontWeight: '700', marginBottom: 6 }, subtitle: { color: '#66756F', fontSize: 14, marginBottom: 18 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }, chip: { borderWidth: 1, borderColor: '#DCE5DF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 }, selected: { backgroundColor: '#2D6A55', borderColor: '#2D6A55' }, chipText: { color: '#53675F' }, selectedText: { color: 'white' }, progress: { flexDirection: 'row', gap: 10, marginBottom: 22 }, metric: { flex: 1, borderRadius: 16, padding: 16, backgroundColor: '#E7F1EB' }, number: { color: '#18352E', fontSize: 27, fontWeight: '700' }, metricName: { color: '#557467', marginTop: 3 }, section: { color: '#18352E', fontSize: 19, fontWeight: '700', marginBottom: 10, marginTop: 6 }, card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E6ECE8', borderRadius: 15, padding: 14, marginBottom: 9 }, icon: { fontSize: 25, width: 40 }, name: { color: '#263B34', fontSize: 15, fontWeight: '700' }, detail: { color: '#718079', fontSize: 12, marginTop: 4 }, unlocked: { color: '#2D6A55', fontSize: 12, fontWeight: '700' } });

export function AchievementsScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const dark = useColorScheme() === 'dark';
  const [profiles, setProfiles] = useState<FamilyProfile[]>([EVERYONE]);
  const [profileId, setProfileId] = useState(EVERYONE.id);
  const [events, setEvents] = useState<RoutineEvent[]>([]);
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([]);
  useFocusEffect(useCallback(() => { let active = true; void Promise.all([loadProfiles(), loadCompletionHistory()]).then(async ([loadedProfiles, loadedEvents]) => { const loadedUnlocks = await recoverAchievementUnlocks(loadedEvents, loadedProfiles.map((profile) => profile.id)); if (!active) return; setProfiles(loadedProfiles); setEvents(loadedEvents); setUnlocks(loadedUnlocks); }); return () => { active = false; }; }, []));
  const progress = progressForProfile(events, profileId);
  const profileUnlocks = unlocks.filter((unlock) => unlock.profileId === profileId).sort((a, b) => b.unlockedAt - a.unlockedAt);
  const recent = profileUnlocks.slice(0, 3);
  return <SafeAreaView edges={embedded ? [] : appSafeAreaEdges} style={[styles.safe, dark && { backgroundColor: '#111A17' }]}><ScrollView contentContainerStyle={styles.content}>
    {!embedded && <><Text style={[styles.title, dark && { color: '#E4EEE8' }]}>Achievements</Text><Text style={styles.subtitle}>A little encouragement for the routines you choose to complete.</Text></>}
    <View style={styles.chips}>{profiles.map((profile) => <Pressable key={profile.id} onPress={() => setProfileId(profile.id)} style={[styles.chip, profileId === profile.id && styles.selected]}><Text style={[styles.chipText, profileId === profile.id && styles.selectedText]}>{profile.name}</Text></Pressable>)}</View>
    <View style={styles.progress}><View style={styles.metric}><Text style={styles.number}>{progress.today}</Text><Text style={styles.metricName}>Today</Text></View><View style={styles.metric}><Text style={styles.number}>{progress.week}</Text><Text style={styles.metricName}>This week</Text></View></View>
    <Text style={[styles.section, dark && { color: '#E4EEE8' }]}>Recent milestones</Text>
    {recent.map((unlock) => { const item = achievementCatalog.find((achievement) => achievement.id === unlock.achievementId); return item ? <View key={item.id} style={styles.card}><Text style={styles.icon}>{item.icon}</Text><View style={{ flex: 1 }}><Text style={styles.name}>{item.name}</Text><Text style={styles.detail}>Unlocked {new Date(unlock.unlockedAt).toLocaleDateString()}</Text></View></View> : null; })}
    {!recent.length && <Text style={styles.subtitle}>Your milestones will show up here as they happen.</Text>}
    <Text style={[styles.section, dark && { color: '#E4EEE8' }]}>Milestones</Text>
    {achievementCatalog.map((achievement) => { const unlock = profileUnlocks.find((item) => item.achievementId === achievement.id); return <View key={achievement.id} style={[styles.card, dark && { backgroundColor: '#202D27', borderColor: '#34463D' }]}><Text style={styles.icon}>{achievement.icon}</Text><View style={{ flex: 1 }}><Text style={[styles.name, dark && { color: '#E4EEE8' }]}>{achievement.name}</Text><Text style={styles.detail}>{unlock ? `Unlocked ${new Date(unlock.unlockedAt).toLocaleDateString()}` : achievement.description}</Text></View>{unlock ? <Text style={styles.unlocked}>Earned</Text> : <Text style={styles.detail}>In progress</Text>}</View>; })}
  </ScrollView></SafeAreaView>;
}
