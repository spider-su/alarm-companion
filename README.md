# Alarm Companion

Offline-first Expo / React Native alarm and routine reminder app. Routine settings are stored on the device. The bundled sound samples and Android playback path work without network access.

## Android support and behavior

- Android API 24+ (project minimum); built against API 36. The Android alarm implementation uses platform `AlarmManager`, exact alarms when access is granted, notification actions, and a `mediaPlayback` foreground service.
- Exact-alarm access is special app access on Android 12+. Without it, wake-up alarms are scheduled inexactly and Android may delay them. Android 14+ may restrict full-screen alarm intents; when unavailable, the alarm notification remains the entry point.
- Android 13+ notification permission is requested when a routine is enabled. Denial prevents the app from completing that enable action; the user can grant it later in Settings.
- Device battery policies, DND, volume, vendor task-killers, and system TTS availability remain outside the app's control. Alarm delivery cannot be guaranteed on every device.
- iOS and web keep the original Expo notification and JavaScript audio preview path. Reliable native scheduling and foreground playback are Android-only.

## Alarm architecture

- `modules/alarm-companion`: Expo local native module with `AlarmManager`, stable explicit broadcast PendingIntents, recovery receiver, alarm action receiver, lock-screen activity, notification channels, and foreground playback service.
- `plugins/withAlarmCompanion.js`: declares native components/permissions and copies the offline WAV assets into Android resources during prebuild.
- `src/native/alarmCompanion.ts`: typed bridge for routine synchronization, capability checks, preview, snooze, and dismissal.
- `src/data/routines.ts`: routine shape and AsyncStorage persistence. Native scheduling state is derived from this data and stored only to recover already-armed occurrences and snoozes across reboot.
- `src/audio/sequence.ts` routes Android preview to the same native playback service and engine used for scheduled alarms. Other platforms retain their existing Expo audio/TTS implementation.

Daily, weekday, custom weekday, and once schedules are evaluated using device local wall-clock time. A time-zone or system-clock change cancels and calculates the next local occurrence again. Editing, disabling, and deleting routines synchronizes or cancels their stable alarm identities. Reboot, package replacement, time changes, and exact-access changes restore schedules idempotently.

**Missed one-time policy:** if a one-time alarm's stored trigger time passed while the device was off or the app was unavailable, recovery expires it and disables that occurrence. It will not ring hours later. Recurring routines continue at their next local wall-clock occurrence.

## Playback and reminders

An alarm starts the bundled nature loop, fades it in, waits the configured intro interval, ducks the loop while Android TTS speaks, then restores the loop until Snooze or Dismiss. Alarms continue in the foreground service when the screen is off. TTS uses the selected installed voice when available, then the requested language, then the system default. A bundled chime is used when a selected sound cannot be loaded. Only one playback session runs at a time; a newer trigger replaces the active session.

Snooze stops playback and schedules one replacement after the configured interval; the original repeating occurrence remains scheduled. Dismiss stops playback, removes the active notification, cancels the snooze, and leaves the next recurring occurrence intact.

Reminders offer **Notification only**, **Notification + sound**, and **Notification + spoken message**. They never request an automatic full-screen launch and playback ends automatically. If exact access is unavailable, sound/speech reminders fall back to the notification. Android notification permission and exact-alarm/full-screen capability status are shown in Settings.

## Permissions

| Permission | Purpose |
|---|---|
| `POST_NOTIFICATIONS` | Show alarm/reminder notifications on Android 13+. |
| `SCHEDULE_EXACT_ALARM` | User-controlled exact schedule access on Android 12+. This is not requested during onboarding. |
| `USE_FULL_SCREEN_INTENT` | Alarm-only lock-screen activity where Android permits it. |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Keep alarm audio/TTS alive while the screen is off. |
| `RECEIVE_BOOT_COMPLETED` | Rebuild scheduled alarms after device reboot. |
| `VIBRATE` | Platform notification vibration behavior. |

The app does not request overlay or storage permissions. Android controls DND, silent mode, lock-screen privacy, exact-alarm eligibility, and full-screen intent availability.

## Run and build

Requires Node.js/npm, Android Studio/SDK, and JDK 17 for the current Android native build.

```sh
npm ci
npm run ci
npx expo prebuild --platform android
npm run android
```

To build a debug APK with JDK 17:

```sh
JAVA_HOME=/path/to/jdk-17 PATH=/path/to/jdk-17/bin:$PATH ./android/gradlew -p android assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Verification and manual Android checklist

Automated checks cover TypeScript, lint, routine persistence, JS schedule/snooze calculations, and native local-calendar schedule calculations for daily, weekday, custom-day, DST, and time-zone cases. The Android debug APK build compiles the native module and manifest. These checks do not prove AlarmManager, notification, audio, or lock-screen behavior on a physical Android device.

- [ ] Alarm in 2 minutes with app open.
- [ ] Alarm in 2 minutes with app backgrounded.
- [ ] Alarm while screen is locked; verify full-screen policy and fallback notification.
- [ ] Alarm after app process termination.
- [ ] Alarm after device reboot.
- [ ] Snooze twice, then dismiss.
- [ ] Edit an existing alarm and confirm only the new time fires.
- [ ] Disable an alarm and confirm it does not fire.
- [ ] Delete an alarm and confirm it does not fire.
- [ ] Two alarms close together; verify the active playback replacement and actions.
- [ ] Notification-only reminder while locked.
- [ ] Spoken reminder while backgrounded; verify automatic finish.
- [ ] Silent mode and Do Not Disturb.
- [ ] Deny notification/exact-alarm access, then grant it and retry.
- [ ] Offline operation.

No physical Android device or emulator was available during implementation; the build is ready for device validation, not verified for end-to-end reliability.
