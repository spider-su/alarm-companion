import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
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

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F7F9F7' }, content: { flex: 1, padding: 20, paddingBottom: 32 }, title: { color: '#18352E', fontSize: 27, fontWeight: '700', marginTop: 18 }, intro: { color: '#718079', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 12 }, section: { color: '#557165', fontSize: 12, letterSpacing: 1.2, fontWeight: '700', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' }, card: { backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: '#E4EBE6', padding: 14, marginBottom: 9 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }, name: { color: '#253A32', fontSize: 15, fontWeight: '700', flex: 1 }, detail: { color: '#728079', fontSize: 13, lineHeight: 19, marginTop: 5 }, input: { minHeight: 44, borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, color: '#20362E', backgroundColor: 'white', fontSize: 15, marginTop: 8 }, button: { minHeight: 46, minWidth: 64, paddingHorizontal: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F1EB', borderRadius: 12, marginTop: 8 }, primary: { backgroundColor: '#2D6A55' }, buttonText: { color: '#2D6A55', fontWeight: '700', fontSize: 14 }, primaryText: { color: 'white' }, chip: { minHeight: 44, justifyContent: 'center', borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 22, paddingHorizontal: 13, backgroundColor: 'white' }, warning: { backgroundColor: '#F4F0E6', borderRadius: 12, padding: 13, color: '#695D3B', fontSize: 13, lineHeight: 19 }, disabled: { opacity: 0.45 }, editor: { padding: 14, marginTop: 8, backgroundColor: '#F4F7F4', borderRadius: 12 }, selected: { backgroundColor: '#E8F1EB', borderColor: '#2D6A55' }, disclosure: { minHeight: 46, justifyContent: 'center' } });

export function VoiceLibraryScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const dark = useColorScheme() === 'dark';
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recorderState = useAudioRecorderState(recorder, 250);
  const [library, setLibrary] = useState<VoiceLibrary>(initialVoiceLibrary);
  const [ttsVoices, setTtsVoices] = useState<Speech.Voice[]>([]);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('My voice');
  const [pendingRecording, setPendingRecording] = useState<VoiceRecording | null>(null);
  const [pendingName, setPendingName] = useState('My voice message');
  const pendingRef = useRef<VoiceRecording | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [editingTone, setEditingTone] = useState<NonNullable<VoiceProfile['tts']>['tone']>('Gentle');
  const [editingProfileRecordingIds, setEditingProfileRecordingIds] = useState<string[]>([]);
  const [showRecordings, setShowRecordings] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [status, setStatus] = useState('');
  const previewStopRef = useRef<(() => void) | null>(null);
  const recorderRef = useRef(recorder);
  const colors = dark ? { bg: '#111A17', card: '#202D27', border: '#34463D', text: '#E4EEE8', muted: '#A8B9AF' } : { bg: '#F7F9F7', card: 'white', border: '#E4EBE6', text: '#253A32', muted: '#728079' };
  const cardStyle = [styles.card, dark && { backgroundColor: colors.card, borderColor: colors.border }];
  const nameStyle = [styles.name, dark && { color: colors.text }];
  const detailStyle = [styles.detail, dark && { color: colors.muted }];
  const warningStyle = [styles.warning, dark && { backgroundColor: '#332F22', color: '#E4D7A8' }];
  useEffect(() => { recorderRef.current = recorder; }, [recorder]);

  useEffect(() => {
    let live = true;
    void Promise.all([loadVoiceLibrary(), Platform.OS === 'web' ? Promise.resolve([]) : Speech.getAvailableVoicesAsync().catch(() => [])]).then(([saved, voices]) => {
      if (live) { setLibrary(saved); setTtsVoices(voices); }
    });
    return () => {
      live = false;
      try { previewStopRef.current?.(); } catch { /* Preview may already be disposed with the screen. */ }
      try { if (recorderRef.current.isRecording) void recorderRef.current.stop().catch(() => undefined); } catch { /* The recorder hook may release its native object first. */ }
      void Speech.stop().catch(() => undefined);
      if (pendingRef.current) deletePrivateRecording(pendingRef.current.uri);
    };
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
      const saved = await storePrivateRecording(uri, 'New voice recording.m4a', 'audio/mp4', recorderState.durationMillis / 1000);
      pendingRef.current = saved;
      setPendingRecording(saved);
      setPendingName('My voice message');
      setStatus('Listen to your recording, then give it a name to save it.');
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
      pendingRef.current = saved;
      setPendingRecording(saved);
      setPendingName(asset.name.replace(/\.[^.]+$/, '') || 'My voice message');
      setStatus('Listen to the audio, then give it a name to save it.');
    } catch (error) { Alert.alert('Could not import audio', error instanceof Error ? error.message : 'Choose a readable audio file.'); }
  }

  async function savePendingRecording() {
    if (!pendingRecording) return;
    const name = pendingName.trim();
    if (!name) { Alert.alert('Add a name', 'Choose a friendly name for this voice recording.'); return; }
    const saved = { ...pendingRecording, name };
    const profile: VoiceProfile = { id: `voice-recorded-${Date.now()}`, name, kind: 'recording', recordingIds: [saved.id] };
    await persist({ ...library, recordings: [...library.recordings, saved], profiles: [...library.profiles, profile] });
    setSelectedClips((ids) => [...ids, saved.id]);
    pendingRef.current = null;
    setPendingRecording(null);
    setStatus(`“${name}” is saved as a reusable voice on this device.`);
  }

  function discardPendingRecording() {
    if (pendingRecording) deletePrivateRecording(pendingRecording.uri);
    pendingRef.current = null;
    setPendingRecording(null);
    setStatus('Recording discarded.');
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
    const existing = library.profiles.find((profile) => profile.kind === 'tts' && profile.tts?.voice === voice.identifier);
    const profile: VoiceProfile = existing ?? { id: `voice-tts-${Date.now()}`, name: voice.name || voice.language, kind: 'tts', tts: { language: voice.language, voice: voice.identifier, tone: 'Gentle' } };
    const profiles = existing ? library.profiles : [...library.profiles, profile];
    await persist({ ...library, profiles, defaultProfileId: profile.id });
    setStatus(`“${profile.name}” is now the default voice for new routines.`);
  }

  function beginProfileEdit(profile: VoiceProfile) {
    setEditingProfileId(profile.id);
    setEditingProfileName(profile.name);
    setEditingTone(profile.tts?.tone ?? 'Gentle');
    setEditingProfileRecordingIds(profile.recordingIds ?? []);
  }

  async function saveProfileEdit(profile: VoiceProfile) {
    const name = editingProfileName.trim();
    if (!name) { Alert.alert('Add a name', 'Voice names cannot be empty.'); return; }
    if (profile.kind === 'recording' && !editingProfileRecordingIds.length) { Alert.alert('Choose a recording', 'A family voice profile needs at least one recording.'); return; }
    const profiles = library.profiles.map((item) => item.id === profile.id ? { ...item, name, ...(item.kind === 'tts' ? { tts: { ...(item.tts ?? { language: 'en-US' }), tone: editingTone } } : { recordingIds: editingProfileRecordingIds }) } : item);
    await persist({ ...library, profiles });
    setEditingProfileId(null);
    setStatus(`Voice “${name}” updated.`);
  }

  async function previewProfile(profile: VoiceProfile) {
    if (Platform.OS === 'web') return;
    if (profile.kind === 'recording') {
      const recording = library.recordings.find((item) => profile.recordingIds?.includes(item.id));
      if (recording) await previewRecording(recording);
      else Alert.alert('No recording yet', 'Add a recording to this voice profile before previewing it.');
      return;
    }
    try {
      await Speech.stop();
      previewStopRef.current?.();
      previewStopRef.current = () => { void Speech.stop(); };
      setStatus(`Playing “${profile.name}”.`);
      Speech.speak('This is a preview of the selected voice.', { language: profile.tts?.language, voice: profile.tts?.voice, onDone: () => setStatus(''), onStopped: () => setStatus(''), onError: () => setStatus('Could not play this voice.') });
    } catch (error) { Alert.alert('Voice unavailable', error instanceof Error ? error.message : 'This device voice could not be played.'); }
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

  function confirmDeleteProfile(profile: VoiceProfile) {
    Alert.alert('Delete voice?', `“${profile.name}” will be removed. Routines using it will switch to the default voice.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void deleteProfile(profile) }]);
  }

  function confirmRemoveRecording(recording: VoiceRecording) {
    Alert.alert('Delete recording?', `“${recording.name}” and its private copy will be deleted.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void removeRecording(recording) }]);
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

  return <SafeAreaView edges={embedded ? [] : appSafeAreaEdges} style={[styles.safe, dark && { backgroundColor: colors.bg }]}><ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
    {!embedded && <Text style={[styles.title, dark && { color: colors.text }]}>Voice Library</Text>}
    <Text style={[styles.intro, dark && { color: colors.muted }]}>Choose a device voice or save a familiar voice for your family. Voice recordings stay in private app storage.</Text>
    {status ? <Text accessibilityLiveRegion="polite" style={detailStyle}>{status}{recorderState.isRecording ? ` ${Math.floor(recorderState.durationMillis / 1000)}s` : ''}</Text> : null}

    <Text style={[styles.section, dark && { color: '#9BC5AA' }]}>Your voices</Text>
    {library.profiles.map((profile) => <View key={profile.id} style={cardStyle}>
      <View style={styles.row}><Text style={nameStyle}>{profile.name}</Text>{library.defaultProfileId === profile.id && <Text style={detailStyle}>Default</Text>}</View>
      <Text style={detailStyle}>{profile.kind === 'tts' ? `Device voice · ${profile.tts?.language ?? 'system language'}` : `${profile.recordingIds?.length ?? 0} family recording${profile.recordingIds?.length === 1 ? '' : 's'}${Platform.OS === 'web' ? ' · Manage in Android app' : ''}`}</Text>
      <View style={styles.row}>
        {Platform.OS !== 'web' && <Pressable accessibilityRole="button" style={styles.button} onPress={() => void previewProfile(profile)}><Text style={styles.buttonText}>▶ Preview</Text></Pressable>}
        {Platform.OS !== 'web' && library.defaultProfileId !== profile.id && <Pressable accessibilityRole="button" style={styles.button} onPress={() => void setDefault(profile.id)}><Text style={styles.buttonText}>Use by default</Text></Pressable>}
        {!(Platform.OS === 'web' && profile.kind === 'recording') && <Pressable accessibilityRole="button" style={styles.button} onPress={() => editingProfileId === profile.id ? setEditingProfileId(null) : beginProfileEdit(profile)}><Text style={styles.buttonText}>{editingProfileId === profile.id ? 'Close edit' : 'Edit'}</Text></Pressable>}
      </View>
      {editingProfileId === profile.id && <View style={[styles.editor, dark && { backgroundColor: '#17231D' }]}><Text style={detailStyle}>Voice name</Text><TextInput accessibilityLabel="Voice name" value={editingProfileName} onChangeText={setEditingProfileName} style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />{profile.kind === 'tts' ? <><Text style={detailStyle}>Speaking tone</Text><View style={styles.row}>{(['Gentle', 'Cheerful', 'Firm', 'Playful'] as const).map((tone) => <Pressable key={tone} accessibilityRole="radio" accessibilityState={{ checked: editingTone === tone }} onPress={() => setEditingTone(tone)} style={[styles.chip, editingTone === tone && styles.selected]}><Text style={styles.buttonText}>{tone}</Text></Pressable>)}</View></> : <><Text style={detailStyle}>Recordings used by this voice</Text>{library.recordings.map((recording) => <Pressable key={recording.id} accessibilityRole="checkbox" accessibilityState={{ checked: editingProfileRecordingIds.includes(recording.id) }} onPress={() => setEditingProfileRecordingIds((ids) => ids.includes(recording.id) ? ids.filter((id) => id !== recording.id) : [...ids, recording.id])} style={styles.row}><Text style={nameStyle}>{recording.name}</Text><Text style={styles.buttonText}>{editingProfileRecordingIds.includes(recording.id) ? '✓ Included' : 'Add'}</Text></Pressable>)}</>}<Pressable accessibilityRole="button" style={[styles.button, styles.primary]} onPress={() => void saveProfileEdit(profile)}><Text style={[styles.buttonText, styles.primaryText]}>Save voice</Text></Pressable>{library.profiles.length > 1 && <Pressable accessibilityRole="button" style={styles.button} onPress={() => confirmDeleteProfile(profile)}><Text style={[styles.buttonText, { color: '#A24F45' }]}>Delete voice</Text></Pressable>}</View>}
    </View>)}

    <Text style={[styles.section, dark && { color: '#9BC5AA' }]}>Use a device voice</Text>
    {Platform.OS === 'web' ? <Text style={warningStyle}>Browser voices vary by browser and device. Use Android to preview installed voices and rely on alarms.</Text> : <>
      {ttsVoices.length === 0 && <Text style={detailStyle}>No installed voices were found. The device may use its default voice or offer voice downloads in system settings.</Text>}
      {ttsVoices.map((voice) => <View key={voice.identifier} style={cardStyle}><View style={styles.row}><View style={{ flex: 1 }}><Text style={nameStyle}>{voice.name || voice.language}</Text><Text style={detailStyle}>{voice.language}</Text></View><Pressable accessibilityRole="button" style={styles.button} onPress={() => void ttsPreview(voice)}><Text style={styles.buttonText}>Preview</Text></Pressable><Pressable accessibilityRole="button" style={[styles.button, styles.primary]} onPress={() => void createTtsProfile(voice)}><Text style={[styles.buttonText, styles.primaryText]}>Use</Text></Pressable></View></View>)}
    </>}

    <Text style={[styles.section, dark && { color: '#9BC5AA' }]}>Add a family voice</Text>
    {Platform.OS === 'web' ? <Text style={warningStyle}>Recording and importing private voice files are available in the Android app. Browser storage cannot keep these recordings in the app’s private file storage.</Text> : <>
      <Text style={styles.detail}>Ask permission before recording or importing someone’s voice. The audio stays on this device.</Text>
      <View style={styles.row}>
        {!recorderState.isRecording ? <Pressable accessibilityRole="button" disabled={Boolean(pendingRecording)} onPress={() => void startRecording()} style={[styles.button, styles.primary, { flex: 1 }, (pendingRecording || recorderState.isRecording) && styles.disabled]}><Text style={[styles.buttonText, styles.primaryText]}>Record a voice</Text></Pressable> : <Pressable accessibilityRole="button" onPress={() => void stopRecording()} style={[styles.button, styles.primary, { flex: 1 }]}><Text style={[styles.buttonText, styles.primaryText]}>Stop recording · {Math.floor(recorderState.durationMillis / 1000)}s</Text></Pressable>}
        <Pressable accessibilityRole="button" disabled={recorderState.isRecording || Boolean(pendingRecording)} onPress={() => void importRecording()} style={[styles.button, { flex: 1 }, (recorderState.isRecording || pendingRecording) && styles.disabled]}><Text style={styles.buttonText}>Import audio</Text></Pressable>
      </View>
      {pendingRecording && <View style={[cardStyle, { borderColor: '#72A18A' }]}><Text style={nameStyle}>Listen, then save your voice</Text><Text style={detailStyle}>{formatDuration(pendingRecording.durationSeconds)} · Stored privately until you save or discard it.</Text><TextInput accessibilityLabel="New voice name" value={pendingName} onChangeText={setPendingName} placeholder="For example, Grandma" style={[styles.input, dark && { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /><View style={styles.row}><Pressable accessibilityRole="button" style={styles.button} onPress={() => void previewRecording(pendingRecording)}><Text style={styles.buttonText}>▶ Listen</Text></Pressable><Pressable accessibilityRole="button" style={[styles.button, styles.primary]} onPress={() => void savePendingRecording()}><Text style={[styles.buttonText, styles.primaryText]}>Save voice</Text></Pressable><Pressable accessibilityRole="button" style={styles.button} onPress={discardPendingRecording}><Text style={styles.buttonText}>Discard</Text></Pressable></View></View>}
    </>}

    {Platform.OS !== 'web' && library.recordings.length > 0 && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showRecordings }} onPress={() => setShowRecordings(!showRecordings)} style={styles.disclosure}><Text style={[styles.section, dark && { color: '#9BC5AA' }]}>{showRecordings ? '− Manage recordings' : '+ Manage recordings'}</Text></Pressable>
      {showRecordings && <>
        <Text style={warningStyle}>Deleting a recording removes its private copy and removes it from any voice profiles that use it.</Text>
        {library.recordings.map((recording) => <View key={recording.id} style={styles.card}>
          <View style={styles.row}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selectedClips.includes(recording.id) }} onPress={() => setSelectedClips((ids) => ids.includes(recording.id) ? ids.filter((id) => id !== recording.id) : [...ids, recording.id])} style={styles.chip}><Text style={styles.buttonText}>{selectedClips.includes(recording.id) ? '✓ Selected' : 'Select'}</Text></Pressable><Text style={styles.name}>{recording.name}</Text><Text style={styles.detail}>{formatDuration(recording.durationSeconds)}</Text></View>
          {renamingId === recording.id && <View style={styles.row}><TextInput accessibilityLabel="Recording name" value={renameValue} onChangeText={setRenameValue} style={[styles.input, { flex: 1 }]} placeholder="Recording name"/><Pressable accessibilityRole="button" onPress={() => void renameRecording(recording)} style={styles.chip}><Text style={styles.buttonText}>Save</Text></Pressable></View>}
          <View style={styles.row}>{Platform.OS !== 'web' && <Pressable accessibilityRole="button" onPress={() => void previewRecording(recording)} style={styles.button}><Text style={styles.buttonText}>▶ Preview</Text></Pressable>}<Pressable accessibilityRole="button" onPress={() => { setRenamingId(recording.id); setRenameValue(recording.name); }} style={styles.button}><Text style={styles.buttonText}>Rename</Text></Pressable><Pressable accessibilityRole="button" onPress={() => confirmRemoveRecording(recording)} style={styles.button}><Text style={[styles.buttonText, { color: '#A24F45' }]}>Delete</Text></Pressable></View>
        </View>)}
        <TextInput accessibilityLabel="Voice profile name" value={profileName} onChangeText={setProfileName} style={styles.input} placeholder="Family voice name" />
        <Pressable accessibilityRole="button" onPress={() => void createRecordingProfile()} style={[styles.button, styles.primary]}><Text style={[styles.buttonText, styles.primaryText]}>Create voice from selected recordings</Text></Pressable>
      </>}
    </>}
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
