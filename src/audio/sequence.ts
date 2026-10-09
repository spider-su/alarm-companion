import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { previewNativeRoutine, stopNativePlayback } from '../native/alarmCompanion';
import type { Routine } from '../data/routines';
import { chooseAvailableRecording, chooseTextVariant, loadVoiceLibrary, resolveTtsSettings } from '../data/voices';
import { recordingExists } from '../data/recordings';
import { createPlaybackCleanup, releaseAudioResource } from './playbackCleanup';
import birds from '../../assets/sounds/birds.wav';
import rain from '../../assets/sounds/rain.wav';
import ocean from '../../assets/sounds/ocean.wav';
import stream from '../../assets/sounds/stream.wav';
import chime from '../../assets/sounds/chime.wav';

const tracks = {
  birds, rain, ocean, stream, chime
} as const;
export async function playSequence(routine: Routine, onState: (message: string) => void): Promise<() => void> {
  const library = await loadVoiceLibrary();
  const profile = library.profiles.find((item) => item.id === (routine.voiceProfileId ?? library.defaultProfileId));
  if (!profile) throw new Error('This voice profile is unavailable. Choose another profile in the routine editor.');
  const recording = routine.previewAudioUri ? { uri: routine.previewAudioUri } : chooseAvailableRecording(profile, library.recordings, recordingExists);
  if (profile.kind === 'recording' && !recording) throw new Error('No accessible recordings remain in this voice profile. Re-import a clip or choose another profile.');
  if (routine.previewAudioUri && !recordingExists(routine.previewAudioUri)) throw new Error('This recording is missing or inaccessible. Re-import it or choose another profile.');
  const message = chooseTextVariant(routine.messageVariants, routine.message ?? routine.name);
  const speech = resolveTtsSettings(profile, routine.ttsOverrides);
  const resolved: Routine & { selectedMessage?: string; selectedRecordingUri?: string; speechConfig?: typeof speech } = { ...routine, selectedMessage: message, selectedRecordingUri: recording?.uri, speechConfig: speech };
  if (Platform.OS === 'android') {
    const started = await previewNativeRoutine(resolved);
    if (!started) throw new Error('A wake-up alarm is already active. This preview will not interrupt it.');
    onState(`Playing ${routine.sound === 'none' ? 'voice' : routine.sound}…`);
    let stopped = false;
    return () => { if (!stopped) { stopped = true; void stopNativePlayback(); onState('Playback stopped'); } };
  }
  await Speech.stop();
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' });
  let stopped = false;
  let player: ReturnType<typeof createAudioPlayer> | undefined;
  let voicePlayer: ReturnType<typeof createAudioPlayer> | undefined;
  let fadeTimer: ReturnType<typeof setInterval> | undefined;
  let introTimer: ReturnType<typeof setTimeout> | undefined;
  let repeatTimer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = createPlaybackCleanup();
  cleanup.add(() => { if (fadeTimer) clearInterval(fadeTimer); if (introTimer) clearTimeout(introTimer); if (repeatTimer) clearTimeout(repeatTimer); });
  cleanup.add(() => { void Speech.stop(); });
  cleanup.add(() => releaseAudioResource(player));
  const unregisterVoiceCleanup = cleanup.add(() => releaseAudioResource(voicePlayer));
  const stop = () => {
    stopped = true;
    cleanup.cancel();
    player = undefined;
    voicePlayer = undefined;
    onState('Playback stopped');
  };
  try {
    if (routine.sound !== 'none') {
      player = createAudioPlayer(tracks[routine.sound as keyof typeof tracks]);
      player.loop = true;
      player.volume = 0;
      player.play();
      const steps = Math.max(1, Math.ceil(routine.fadeSeconds * 5));
      let step = 0;
      fadeTimer = setInterval(() => {
        if (!player || stopped) return;
        step++;
        player.volume = Math.min(routine.backgroundVolume, routine.backgroundVolume * step / steps);
        if (step >= steps && fadeTimer) { clearInterval(fadeTimer); fadeTimer = undefined; }
      }, 200);
    }
    onState(routine.sound === 'none' ? 'Preparing voice…' : `Playing ${routine.sound}…`);
    const speak = async () => {
      if (stopped) return;
      if (player) player.volume = routine.backgroundVolume * 0.22;
      onState('Speaking…');
      let voice: string | undefined;
      let language: string | undefined;
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const selected = voices.find((item) => item.identifier === speech.voice)
          ?? voices.find((item) => item.language.toLowerCase().startsWith(speech.language.slice(0, 2).toLowerCase()));
        voice = selected?.identifier;
        language = selected?.language;
      } catch { /* Native TTS will use its configured default voice. */ }
      if (stopped) return;
      if (recording) {
        try {
          voicePlayer = createAudioPlayer(recording.uri);
          voicePlayer.volume = routine.voiceVolume;
          voicePlayer.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish && !stopped) { releaseAudioResource(voicePlayer); unregisterVoiceCleanup(); voicePlayer = undefined; if (player) player.volume = routine.backgroundVolume; onState('Playing background sound'); if (routine.repeatVoice) repeatTimer = setTimeout(() => { void speak(); }, 15_000); }
          });
          voicePlayer.play();
        } catch { onState('Recording playback failed. Re-import the file or choose another profile.'); if (player) player.volume = routine.backgroundVolume; }
        return;
      }
      Speech.speak(message, {
        ...(language ? { language } : {}), ...(voice ? { voice } : {}), rate: speech.rate,
        pitch: speech.pitch, volume: routine.voiceVolume,
        onDone: () => {
          if (stopped) return;
          if (player) player.volume = routine.backgroundVolume;
          onState('Playing background sound');
          if (routine.repeatVoice) repeatTimer = setTimeout(() => { void speak(); }, 15_000);
        },
        onError: () => onState('Voice playback failed. Check installed TTS voices.')
      });
    };
    introTimer = setTimeout(() => { void speak(); }, routine.introSeconds * 1000);
  } catch (error) {
    stop();
    onState(error instanceof Error ? `Audio error: ${error.message}` : 'Audio playback failed');
  }
  return stop;
}
