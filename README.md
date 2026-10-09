# Alarm Companion

An offline-first Expo / React Native prototype for gentle wake-up alarms and spoken routine reminders. The first launch includes three editable examples. They are disabled until the user enables them.

## What works in this prototype

- Create, edit, enable, disable, and delete routines; routines persist in device-local storage.
- Choose an alarm, voice reminder, or sleep reminder; time, one-time/daily/weekday/custom-day repeat, intro sound, message, language, Android TTS voice, tone, speed, pitch, fade, and snooze interval.
- Preview a locally bundled sound-to-voice sequence. The five small WAV loops are original synthesized sound textures and require no network connection.
- Schedule repeating local notifications, including a notification when an alarm routine fires. Tapping an alarm notification opens the in-app active alarm view; snooze schedules a one-time follow-up notification and dismiss stops preview playback.
- Set defaults for new routines (voice language, tone, intro sound, fade), check notification permission and installed English/Polish TTS voices, and preview voice or the full audio sequence.

## Run locally

Requires Node.js/npm and Android Studio with an Android SDK/emulator for native Android runs.

```sh
npm ci
npm run android
```

For Metro development, `npm start` then press `a`. After installing a development build, use `npm run ci` for typecheck, lint, and unit tests. Expo Go does not include all native modules used here; use a development/native build.

## Architecture

- `src/screens/HomeScreen.tsx`: routine list/editor, local notification scheduling, alarm notification response, and active alarm actions.
- `src/data/routines.ts`: routine model, disabled demo data, and AsyncStorage persistence.
- `src/data/schedule.ts`: local wall-clock occurrence and snooze calculations.
- `src/audio/sequence.ts`: bundled audio playback, fade, native speech, voice/language fallback, and cleanup.
- `src/screens/SettingsScreen.tsx`: notification permission, TTS availability, and voice test.
- `assets/sounds/`: generated offline loop samples.

No account, API, analytics SDK, or backend is used.

## Android permissions

| Permission | Purpose |
|---|---|
| `POST_NOTIFICATIONS` | Required on Android 13+ to show scheduled reminders and alarm notifications. The app asks when the user first enables a routine. |
| `VIBRATE` | Allows the routine notification channel to use a brief vibration pattern. |
| `MODIFY_AUDIO_SETTINGS` | Added by `expo-audio` for audio playback and focus behavior. |
| `RECEIVE_BOOT_COMPLETED` | Added by `expo-notifications`; its native receiver restores scheduled local notifications after reboot. This has not been verified on a device. |
| `INTERNET` | Included by the React Native/Expo base for development tooling and Metro. The app has no API or network data flow. |
| `ACCESS_NETWORK_STATE`, `WAKE_LOCK`, `com.google.android.c2dm.permission.RECEIVE` | Declared by the Expo notification/Firebase dependency stack. Remote push is not configured by this prototype. |
| `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE` | Dependency manifest declaration; the app does not read install attribution. |
| OEM launcher badge permissions (`com.sec.android.provider.badge.*`, `com.htc.launcher.*`, `com.sonyericsson.home.*`, `com.sonymobile.home.*`, `com.anddoes.launcher.*`, `com.majeur.launcher.*`, `com.huawei.android.launcher.*`, `com.oppo.launcher.*`, `me.everything.badger.permission.BADGE_COUNT_*`, `android.permission.READ_APP_BADGE`) | Included by notification badge compatibility code; the app does not set a badge count. |
| `com.spidersu.alarmcompanion.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | App-scoped signature permission added by Android tooling for internal dynamic receivers. |

The config blocks `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, and `WRITE_EXTERNAL_STORAGE`; none is needed by this app. It does not request `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, full-screen intent, or foreground-service permissions. Android may delay local notifications under battery restrictions, and the app cannot wake into a full-screen alarm over the lock screen. Expo Notifications restores scheduled notifications after reboot, but this has not been device-verified. Android TTS uses the system's installed engine and voice data; unavailable languages fall back to the installed system default. Android DND and device volume policy remain under system control.

## Verification status and manual device checklist

Automated tests cover weekday/once calculations, DST wall-clock behavior, snooze arithmetic, demo defaults, and local persistence. They do not prove Android notification delivery, audio focus, or locked-screen behavior. No physical-device validation is claimed.

- [ ] Alarm while app is open.
- [ ] Alarm while app is backgrounded.
- [ ] Alarm while phone is locked.
- [ ] Alarm after device reboot.
- [ ] Snooze and dismiss.
- [ ] Notification permission denied.
- [ ] Exact-alarm permission denied (current fallback is a standard local notification; the app does not request exact-alarm access).
- [ ] Selected TTS voice unavailable; verify system voice fallback.
- [ ] No network connection.
- [ ] Multiple reminders scheduled close together.
- [ ] Phone in silent and Do Not Disturb modes.
- [ ] App process terminated by Android.

## Known limitations

- Expo local notifications are used instead of `AlarmManager` exact alarms. The active alarm view appears after the user opens/taps the notification and is not a full-screen lock-screen alarm.
- Reminder notifications are standard notifications; speech does not start automatically from the background.
- Time-zone/system-clock rescheduling and Android process-death recovery are not device-verified.
- Audio and TTS preview are functional while the app is running; scheduled notification playback does not run the sound-to-voice sequence autonomously.
- Product colors adapt to the system light/dark setting; native controls follow Android's theme behavior.

## Next milestone

Add a small native Android module for `AlarmManager`, exact-alarm permission guidance, reboot/time-change rescheduling, foreground audio playback, and lock-screen alarm actions. Keep the Expo UI, data model, and preview engine, then validate the complete flow on Android devices across permission and DND states before claiming reliability.
