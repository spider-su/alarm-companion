export async function startAfterRecordingPermission(
  request: () => Promise<{ granted: boolean }>,
  start: () => Promise<void>
): Promise<boolean> {
  if (!(await request()).granted) return false;
  await start();
  return true;
}
