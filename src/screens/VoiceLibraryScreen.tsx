import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSafeAreaEdges } from '../platform/safeArea';
import { loadRoutines } from '../data/routines';
import { deletePrivateRecording, storePrivateRecording } from '../data/recordings';
import { DEFAULT_PROFILE_ID, initialVoiceLibrary, loadVoiceLibrary, saveVoiceLibrary, type VoiceLibrary, type VoiceProfile, type VoiceRecording } from '../data/voices';
import { syncNativeRoutines } from '../native/alarmCompanion';
import { playSequence } from '../audio/sequence';
import { startAfterRecordingPermission } from '../audio/recordingPermission';

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F7F9F7' }, content: { flex: 1, padding: 20 }, title: { color: '#18352E', fontSize: 27, fontWeight: '700', marginTop: 18 }, intro: { color: '#718079', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 12 }, section: { color: '#557165', fontSize: 12, letterSpacing: 1.2, fontWeight: '700', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' }, card: { backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: '#E4EBE6', padding: 14, marginBottom: 9 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, name: { color: '#253A32', fontSize: 15, fontWeight: '700', flex: 1 }, detail: { color: '#728079', fontSize: 12, lineHeight: 18, marginTop: 5 }, input: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, color: '#20362E', backgroundColor: 'white', fontSize: 14, marginTop: 8 }, button: { minHeight: 42, paddingHorizontal: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F1EB', borderRadius: 12, marginTop: 8 }, primary: { backgroundColor: '#2D6A55' }, buttonText: { color: '#2D6A55', fontWeight: '700', fontSize: 13 }, primaryText: { color: 'white' }, chip: { borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 6 }, warning: { backgroundColor: '#F4F0E6', borderRadius: 12, padding: 12, color: '#695D3B', fontSize: 12, lineHeight: 18 } });

export function VoiceLibraryScreen() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recorderState = useAudioRecorderState(recorder, 250);
  const [library, setLibrary] = useState<VoiceLibrary>(initialVoiceLibrary);
  const [ttsVoices, setTtsVoices] = useState<Speech.Voice[]>([]);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('My voice');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [status, setStatus] = useState('');
  const previewStopRef = useRef<(() => void) | null>(null);
  const recorderRef = useRef(recorder);
  useEffect(() => { recorderRef.current = recorder; }, [recorder]);

  useEffect(() => {
    let live = true;
    void Promise.all([loadVoiceLibrary(), Speech.getAvailableVoicesAsync().catch(() => [])]).then(([saved, voices]) => {
      if (live) { setLibrary(saved); setTtsVoices(voices); }
    });
    return () => { live = false; previewStopRef.current?.(); if (recorderRef.current.isRecording) void recorderRef.current.stop(); void Speech.stop(); };
  }, []);

  async function persist(next: VoiceLibrary) {
    setLibrary(next);
    await saveVoiceLibrary(next);
    const routines = await loadRoutines();
    await syncNativeRoutines(routines);
  }

  function confirmConsent(activity: 'recording' | 'import'): Promise<boolean> {
    return new Promise((resolve) => Alert.alert(
      'Respect voice privacy',
      `Only ${activity === 'recording' ? 'record' : 'import'} a person's voice when you have their permission. Voice audio stays on this device.`,
      [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'I have permission', onPress: () => resolve(true) }]
    ));
  }

  async function startRecording() {
    if (!(await confirmConsent('recording'))) return;
    try {
      const started = await startAfterRecordingPermission(requestRecordingPermissionsAsync, async () => {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setStatus('Recording…');
      });
      if (!started) Alert.alert('Microphone access is off', 'Allow microphone access in Android or iOS Settings to record a voice message.');
    } catch (error) { Alert.alert('Could not start recording', error instanceof Error ? error.message : 'Check microphone access and available storage.'); }
  }

  async function stopRecording() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('The recorder did not return an audio file.');
      const saved = await storePrivateRecording(uri, `Voice ${new Date().toLocaleString()}.m4a`, 'audio/mp4', recorderState.durationMillis / 1000);
      const next = { ...library, recordings: [...library.recordings, saved] };
      await persist(next);
      setSelectedClips((ids) => [...ids, saved.id]);
      setStatus('Recording saved in private app storage.');
    } catch (error) { Alert.alert('Could not save recording', error instanceof Error ? error.message : 'The recording file is unavailable.'); }
    finally { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined); }
  }

  async function importRecording() {
    if (!(await confirmConsent('import'))) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const copied = await storePrivateRecording(asset.uri, asset.name, asset.mimeType ?? 'audio/*', 0);
      const duration = await inspectDuration(copied.uri);
      const saved = { ...copied, durationSeconds: duration };
      await persist({ ...library, recordings: [...library.recordings, saved] });
      setSelectedClips((ids) => [...ids, saved.id]);
      setStatus('Imported into private app storage.');
    } catch (error) { Alert.alert('Could not import audio', error instanceof Error ? error.message : 'Choose a readable audio file.'); }
  }

  async function previewRecording(recording: VoiceRecording) {
    try {
      const routines = await loadRoutines();
      const sample = routines[0];
      if (!sample) throw new Error('No routine is available to preview with.');
      previewStopRef.current?.();
      const profile = library.profiles.find((item) => item.kind === 'recording' && item.recordingIds?.includes(recording.id));
      const stop = await playSequence({ ...sample, voiceProfileId: profile?.id ?? library.defaultProfileId, previewAudioUri: recording.uri }, setStatus);
      previewStopRef.current = stop;
    } catch (error) { Alert.alert('Could not preview recording', error instanceof Error ? error.message : 'The audio file is missing or unsupported.'); }
  }

  async function removeRecording(recording: VoiceRecording) {
    const routines = await loadRoutines();
    const profiles = library.profiles.map((profile) => ({ ...profile, recordingIds: profile.recordingIds?.filter((id) => id !== recording.id) }));
    const removedProfileIds = profiles.filter((p) => p.kind === 'recording' && !(p.recordingIds?.length)).map((p) => p.id);
    const nextProfiles = profiles.filter((p) => !removedProfileIds.includes(p.id));
    const defaultProfileId = removedProfileIds.includes(library.defaultProfileId) ? nextProfiles[0]?.id ?? DEFAULT_PROFILE_ID : library.defaultProfileId;
    const next = { ...library, profiles: nextProfiles.length ? nextProfiles : initialVoiceLibrary.profiles, defaultProfileId, recordings: library.recordings.filter((item) => item.id !== recording.id) };
    deletePrivateRecording(recording.uri);
    await persist(next);
    const repaired = routines.map((routine) => removedProfileIds.includes(routine.voiceProfileId ?? '') ? { ...routine, voiceProfileId: defaultProfileId } : routine);
    await saveRoutineRepair(repaired);
    setSelectedClips((ids) => ids.filter((id) => id !== recording.id));
  }

  async function createTtsProfile(voice: Speech.Voice) {
    const profile: VoiceProfile = { id: `voice-tts-${Date.now()}`, name: voice.name || voice.language, kind: 'tts', tts: { language: voice.language, voice: voice.identifier, tone: 'Gentle' } };
    await persist({ ...library, profiles: [...library.profiles, profile] });
    setStatus(`Created profile “${profile.name}”. Choose it in a routine's voice profile selector.`);
  }

  async function createRecordingProfile() {
    const ids = library.recordings.filter((item) => selectedClips.includes(item.id)).map((item) => item.id);
    if (!ids.length) { Alert.alert('Choose recordings', 'Select one or more clips for this reusable recording profile.'); return; }
    const profile: VoiceProfile = { id: `voice-recorded-${Date.now()}`, name: profileName.trim() || 'My voice', kind: 'recording', recordingIds: ids };
    await persist({ ...library, profiles: [...library.profiles, profile] });
    setStatus(`Created profile “${profile.name}”. Choose it in a routine's voice profile selector.`);
  }

  async function setDefault(id: string) { await persist({ ...library, defaultProfileId: id }); }
  async function renameRecording(recording: VoiceRecording) {
    const name = renameValue.trim();
    if (!name) return;
    await persist({ ...library, recordings: library.recordings.map((item) => item.id === recording.id ? { ...item, name } : item) });
    setRenamingId(null);
  }
  async function deleteProfile(profile: VoiceProfile) {
    const routines = await loadRoutines();
    const profiles = library.profiles.filter((item) => item.id !== profile.id);
    const fallback = profiles[0] ?? initialVoiceLibrary.profiles[0]!;
    const next = profiles.length ? profiles : [fallback];
    const defaultProfileId = library.defaultProfileId === profile.id ? fallback.id : library.defaultProfileId;
    await persist({ ...library, profiles: next, defaultProfileId });
    const updated = routines.map((routine) => routine.voiceProfileId === profile.id ? { ...routine, voiceProfileId: defaultProfileId } : routine);
    await saveRoutineRepair(updated);
  }

  async function ttsPreview(voice: Speech.Voice) {
    try {
      const routines = await loadRoutines();
      const sample = routines[0];
      const ttsProfile = library.profiles.find((item) => item.kind === 'tts');
      if (!sample || !ttsProfile) throw new Error('Create or keep a text-to-speech profile before previewing voices.');
      previewStopRef.current?.();
      const stop = await playSequence({ ...sample, voiceProfileId: ttsProfile.id, ttsOverrides: { language: voice.language, voice: voice.identifier, tone: ttsProfile.tts?.tone ?? 'Gentle' }, messageVariants: [{ id: 'voice-preview', text: 'This is a preview of the selected voice.' }], sound: 'none', introSeconds: 0, repeatVoice: false }, setStatus);
      previewStopRef.current = stop;
    } catch (error) { Alert.alert('Voice unavailable', error instanceof Error ? error.message : 'Android will use an installed fallback voice during playback.'); }
  }

  return <SafeAreaView edges={appSafeAreaEdges} style={styles.safe}><ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Voice Library</Text>
    <Text style={styles.intro}>Profiles are stored locally and can be reused by multiple routines. Ask for permission before recording or importing another person's voice.</Text>
    {status ? <Text style={styles.detail}>{status}{recorderState.isRecording ? ` ${Math.floor(recorderState.durationMillis / 1000)}s` : ''}</Text> : null}

    <Text style={styles.section}>Profiles</Text>
    {library.profiles.map((profile) => <View key={profile.id} style={styles.card}>
      <View style={styles.row}><Text style={styles.name}>{profile.name}</Text>{library.defaultProfileId === profile.id ? <Text style={styles.detail}>Default</Text> : <Pressable onPress={() => void setDefault(profile.id)} style={styles.chip}><Text style={styles.buttonText}>Set default</Text></Pressable>}</View>
      <Text style={styles.detail}>{profile.kind === 'tts' ? `Android TTS · ${profile.tts?.language ?? 'system language'} · ${profile.tts?.tone ?? 'Gentle'} pace` : `${profile.recordingIds?.length ?? 0} recorded clips · random clip per playback`}</Text>
      <Text style={styles.detail}>Assign this profile to an alarm or reminder from its routine editor.</Text>
      {library.profiles.length > 1 && <Pressable onPress={() => void deleteProfile(profile)} style={styles.button}><Text style={styles.buttonText}>Delete profile</Text></Pressable>}
    </View>)}

    <Text style={styles.section}>Personal recordings</Text>
    <Text style={styles.warning}>Voice files remain in this app's private document storage. Importing copies audio into the app; deleting a library item also deletes its private copy.</Text>
    <View style={styles.row}>
      <Pressable disabled={recorderState.isRecording} onPress={() => void startRecording()} style={[styles.button, styles.primary, { flex: 1 }]}><Text style={[styles.buttonText, styles.primaryText]}>● Record message</Text></Pressable>
      {recorderState.isRecording && <Pressable onPress={() => void stopRecording()} style={styles.button}><Text style={styles.buttonText}>Stop · {Math.floor(recorderState.durationMillis / 1000)}s</Text></Pressable>}
    </View>
    <Pressable disabled={recorderState.isRecording} onPress={() => void importRecording()} style={styles.button}><Text style={styles.buttonText}>Import audio file…</Text></Pressable>
    {library.recordings.map((recording) => <View key={recording.id} style={styles.card}>
      <View style={styles.row}><Pressable onPress={() => setSelectedClips((ids) => ids.includes(recording.id) ? ids.filter((id) => id !== recording.id) : [...ids, recording.id])} style={styles.chip}><Text style={styles.buttonText}>{selectedClips.includes(recording.id) ? '✓ Selected' : 'Select'}</Text></Pressable><Text style={styles.name}>{recording.name}</Text><Text style={styles.detail}>{formatDuration(recording.durationSeconds)}</Text></View>
      {renamingId === recording.id && <View style={styles.row}><TextInput value={renameValue} onChangeText={setRenameValue} style={[styles.input, { flex: 1 }]} placeholder="Recording name"/><Pressable onPress={() => void renameRecording(recording)} style={styles.chip}><Text style={styles.buttonText}>Save</Text></Pressable></View>}
      <View style={styles.row}><Pressable onPress={() => void previewRecording(recording)} style={styles.button}><Text style={styles.buttonText}>▶ Preview</Text></Pressable><Pressable onPress={() => { setRenamingId(recording.id); setRenameValue(recording.name); }} style={styles.button}><Text style={styles.buttonText}>Rename</Text></Pressable><Pressable onPress={() => void removeRecording(recording)} style={styles.button}><Text style={[styles.buttonText, { color: '#A24F45' }]}>Delete</Text></Pressable></View>
    </View>)}
    {library.recordings.length > 0 && <><TextInput value={profileName} onChangeText={setProfileName} style={styles.input} placeholder="Recording profile name"/><Pressable onPress={() => void createRecordingProfile()} style={[styles.button, styles.primary]}><Text style={[styles.buttonText, styles.primaryText]}>Create profile from selected clips</Text></Pressable></>}

    <Text style={styles.section}>Android text-to-speech voices</Text>
    {ttsVoices.length === 0 && <Text style={styles.detail}>No installed voices were found. Android may use its system default or download voice data later.</Text>}
    {ttsVoices.map((voice) => <View key={voice.identifier} style={[styles.card, styles.row]}><View style={{ flex: 1 }}><Text style={styles.name}>{voice.name}</Text><Text style={styles.detail}>{voice.language}</Text></View><Pressable onPress={() => void ttsPreview(voice)} style={styles.chip}><Text style={styles.buttonText}>Preview</Text></Pressable><Pressable onPress={() => void createTtsProfile(voice)} style={styles.chip}><Text style={styles.buttonText}>Create</Text></Pressable></View>)}
  </ScrollView></SafeAreaView>;
}

async function inspectDuration(uri: string): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const player = createAudioPlayer(uri);
    const finish = (duration: number) => { if (settled) return; settled = true; subscription.remove(); if (timeout) clearTimeout(timeout); player.remove(); resolve(Math.max(0, Math.round(duration))); };
    const timeout = setTimeout(() => finish(0), 12_000);
    const subscription = player.addListener('playbackStatusUpdate', (status) => { if (status.isLoaded) finish(status.duration); });
    if (player.currentStatus.isLoaded) finish(player.currentStatus.duration);
  });
}

function formatDuration(seconds: number) { return seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Duration unavailable'; }
async function saveRoutineRepair(routines: Awaited<ReturnType<typeof loadRoutines>>) {
  const { saveRoutines } = await import('../data/routines');
  await saveRoutines(routines);
  await syncNativeRoutines(routines);
}
