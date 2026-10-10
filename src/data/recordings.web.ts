import type { VoiceRecording } from './voices';

/** Browser storage is not used for voice recordings; keep the web bundle free of the native file-system module. */
export async function storePrivateRecording(_sourceUri: string, _sourceName: string, _mimeType: string, _durationSeconds: number): Promise<VoiceRecording> {
  throw new Error('Private voice recordings are available in the Android app, not on web.');
}

export function deletePrivateRecording(_uri: string): void {
  // Browser builds do not create private recording files.
}

export function recordingExists(_uri: string): boolean {
  return false;
}
