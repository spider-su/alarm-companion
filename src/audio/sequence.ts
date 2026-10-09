import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import type { Routine } from '../data/routines';
import birds from '../../assets/sounds/birds.wav';
import rain from '../../assets/sounds/rain.wav';
import ocean from '../../assets/sounds/ocean.wav';
import stream from '../../assets/sounds/stream.wav';
import chime from '../../assets/sounds/chime.wav';

const tracks = {
  birds, rain, ocean, stream, chime
} as const;
const tones: Record<Routine['tone'], { rate: number; pitch: number }> = {
  Gentle: { rate: 0.88, pitch: 0.98 }, Cheerful: { rate: 1.06, pitch: 1.08 },
  Firm: { rate: 1, pitch: 1 }, Playful: { rate: 1.08, pitch: 1.15 }
};

export async function playSequence(routine: Routine, onState: (message: string) => void): Promise<() => void> {
  await Speech.stop();
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' });
  let stopped = false;
  let player: ReturnType<typeof createAudioPlayer> | undefined;
  let fadeTimer: ReturnType<typeof setInterval> | undefined;
  let introTimer: ReturnType<typeof setTimeout> | undefined;
  let repeatTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopped = true;
    if (fadeTimer) clearInterval(fadeTimer);
    if (introTimer) clearTimeout(introTimer);
    if (repeatTimer) clearTimeout(repeatTimer);
    void Speech.stop();
    if (player) { player.pause(); player.remove(); player = undefined; }
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
        const selected = voices.find((item) => item.identifier === routine.voice)
          ?? voices.find((item) => item.language.toLowerCase().startsWith(routine.language.slice(0, 2).toLowerCase()));
        voice = selected?.identifier;
        language = selected?.language;
      } catch { /* Native TTS will use its configured default voice. */ }
      if (stopped) return;
      const preset = tones[routine.tone];
      Speech.speak(routine.message, {
        ...(language ? { language } : {}), ...(voice ? { voice } : {}), rate: routine.speed || preset.rate,
        pitch: routine.pitch || preset.pitch, volume: routine.voiceVolume,
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
