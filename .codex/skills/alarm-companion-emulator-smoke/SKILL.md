---
name: alarm-companion-emulator-smoke
description: Install a fresh Alarm Companion APK on an Android emulator and manually inspect core routine, settings, voice library, and playback-preview flows. Does not prove scheduled delivery reliability.
---

# Alarm Companion Android emulator smoke check

Build the tested APK from this checkout with
`./.codex/skills/alarm-companion-build-apk/scripts/build_apk.sh "$PWD"`.
Do not reuse a stale APK or a Metro/debug build. This project has no fixed
Alarm Companion AVD; use an installed Android 35 Google APIs emulator or create
one using the SDK's installed Android 35 image. Record its actual name, serial,
API, resolution, and density.

1. Record `git rev-parse --short HEAD`, `git status --short`, and the APK SHA-256.
2. Run `adb devices -l`. Verify the chosen serial reports
   `getprop ro.kernel.qemu` as `1` before installing or clearing app data.
3. Install `artifacts/app/alarm-companion.apk`, then clear only the app's data on
   this verified emulator with `pm clear com.spidersu.alarmcompanion`.
4. Launch `com.spidersu.alarmcompanion/.MainActivity`. Capture a screenshot and
   UI hierarchy after launch, Home, Settings, Voice Library, and routine editor.
5. Inspect screen rendering, navigation, create/edit/disable a synthetic
   routine, audio preview, voice library navigation, and settings capability
   display. Use synthetic text only; don't import personal recordings.
6. If exercising Android notification permission or exact alarm access, record
   the initial and final values and any changes. Do not change emulator time,
   DND, battery policy, or device-wide state during the default smoke check.
7. Save screenshots, UI dumps, commands/outcomes, commit, and APK SHA-256 under
   a unique `artifacts/emulator-smoke/<YYYYMMDD-HHMM>-<short-commit>/` folder.
   Keep those local and do not commit them unless requested.

Report each step as passed, failed, or skipped. A launch/preview check on an
emulator does not prove exact AlarmManager delivery, notification actions while
locked, process-death/reboot recovery, vendor battery behavior, or physical
device behavior. Those require separate timed/device scenarios.
