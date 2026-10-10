import type { VoiceRecording } from './voices';

/** Browser storage is not used for voice recordings; keep the web bundle free of the native file-system module. */
export async function storePrivateRecording(sourceUri: string, sourceName: string, mimeType: string, durationSeconds: number): Promise<VoiceRecording> {
  void [sourceUri, sourceName, mimeType, durationSeconds];
  throw new Error('Private voice recordings are available in the Android app, not on web.');
}

export function deletePrivateRecording(uri: string): void {
  void uri;
  // Browser builds do not create private recording files.
}

export function recordingExists(uri: string): boolean {
  void uri;
  return false;
}
