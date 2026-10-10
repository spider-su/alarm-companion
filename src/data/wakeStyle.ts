import type { Routine, Tone } from './routines';

export type WakeStyle = 'Gentle' | 'Balanced' | 'Energetic' | 'Custom';

type WakeSettings = Pick<Routine, 'sound' | 'introSeconds' | 'fadeSeconds' | 'backgroundVolume' | 'voiceVolume'> & { tone: Tone };

export const wakeStyles: Record<Exclude<WakeStyle, 'Custom'>, WakeSettings> = {
  Gentle: { sound: 'birds', introSeconds: 8, fadeSeconds: 30, backgroundVolume: 0.35, voiceVolume: 1, tone: 'Gentle' },
  Balanced: { sound: 'birds', introSeconds: 5, fadeSeconds: 20, backgroundVolume: 0.4, voiceVolume: 1, tone: 'Cheerful' },
  Energetic: { sound: 'chime', introSeconds: 0, fadeSeconds: 15, backgroundVolume: 0.5, voiceVolume: 1, tone: 'Firm' }
};

function toneFor(routine: Routine, profileTone?: Tone): Tone {
  return routine.ttsOverrides?.tone ?? profileTone ?? routine.tone ?? 'Gentle';
}

export function wakeStyleFor(routine: Routine, profileTone?: Tone): WakeStyle {
  const matches = (['Gentle', 'Balanced', 'Energetic'] as const).find((style) => {
    const expected = wakeStyles[style];
    return routine.sound === expected.sound
      && routine.introSeconds === expected.introSeconds
      && routine.fadeSeconds === expected.fadeSeconds
      && routine.backgroundVolume === expected.backgroundVolume
      && routine.voiceVolume === expected.voiceVolume
      && toneFor(routine, profileTone) === expected.tone;
  });
  return matches ?? 'Custom';
}

export function applyWakeStyle(routine: Routine, style: Exclude<WakeStyle, 'Custom'>): Routine {
  const settings = wakeStyles[style];
  return { ...routine, ...settings, tone: settings.tone, ttsOverrides: { ...routine.ttsOverrides, tone: settings.tone, speedOverride: undefined, pitchOverride: undefined } };
}
