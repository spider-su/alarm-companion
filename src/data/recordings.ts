import { Directory, File, Paths } from 'expo-file-system';
import type { VoiceRecording } from './voices';

const RECORDING_DIRECTORY = new Directory(Paths.document, 'voice-recordings');

export async function storePrivateRecording(sourceUri: string, sourceName: string, mimeType: string, durationSeconds: number): Promise<VoiceRecording> {
  if (!sourceUri) throw new Error('The selected audio file is unavailable.');
  RECORDING_DIRECTORY.create({ idempotent: true, intermediates: true });
  const extension = sourceName.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? extensionFromUri(sourceUri) ?? 'm4a';
  const id = `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const destination = new File(RECORDING_DIRECTORY, `${id}.${extension}`);
  try {
    await new File(sourceUri).copy(destination, { overwrite: false });
    const info = destination.info();
    if (!info.exists || (info.size ?? 0) === 0) throw new Error('The audio file is empty or inaccessible.');
    return { id, name: sourceName.replace(/\.[^.]+$/, '') || 'Voice recording', uri: destination.uri, durationSeconds: Math.max(0, Math.round(durationSeconds)), mimeType, createdAt: Date.now() };
  } catch (error) {
    if (destination.exists) destination.delete();
    throw new Error(error instanceof Error ? error.message : 'Could not copy the audio file into private storage.', { cause: error });
  }
}

export function deletePrivateRecording(uri: string): void {
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Metadata cleanup should still proceed if the file is already gone. */ }
}

export function recordingExists(uri: string): boolean {
  try { return new File(uri).exists; } catch { return false; }
}

function extensionFromUri(uri: string): string | undefined {
  const match = decodeURIComponent(uri).match(/\.([a-zA-Z0-9]{1,8})(?:[?#]|$)/);
  return match?.[1]?.toLowerCase();
}
