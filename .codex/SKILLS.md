# Alarm Companion project skills

Reusable local workflows for this Expo/React Native Android app live under
`.codex/skills/`. Each workflow has its own `SKILL.md` and supporting files.

## Available workflows

- [Build standalone APK](skills/alarm-companion-build-apk/SKILL.md): build and validate a locally signed release APK at `artifacts/app/alarm-companion.apk` for sideload/QA.
- [Android emulator smoke check](skills/alarm-companion-emulator-smoke/SKILL.md): install that artifact on an Android 35 emulator and inspect the app's routines, settings, voice library, and native alarm preview paths. Alarm delivery guarantees require separate timed/device checks.

The APK and emulator evidence are local artifacts and should not be committed unless separately requested.
