---
name: android-emulator-smoke
description: Smoke-test Alarm Companion on an Android emulator, covering routine editing, voice presets, alarm scheduling and safe areas without touching a physical device.
---

# Alarm Companion Android emulator smoke

1. Record branch/commit, emulator serial, Android API level, screen size and gesture/three-button navigation mode. Confirm with `adb devices -l` that the target is an emulator; **never clear data or change settings on a physical device**.
2. Build and install from the current checkout using the app's Expo/Gradle workflow or install the matching CI standalone test APK. Do not use a stale build. Use disposable test routines only.
3. Check dashboard time-of-day greeting, routine creation/editing, repeat/time selection, sound picker, Gentle/Cheerful/Clear voice presets, advanced settings, Save visibility above system navigation and dark/light contrast.
4. Grant notification and exact-alarm access where supported. Create a disposable alarm a few minutes ahead; check lock-screen notification/activity, audible playback and voice, then Snooze and Dismiss. Verify routine edits/disable cancel or reschedule correctly.
5. If feasible, restart the emulator and check that a recurring future alarm is rescheduled. Record API-level differences and cases blocked by emulator TTS, permissions or battery behavior.
6. Capture screenshots, logs and timestamps for passed/failed cases. Restore modified emulator settings and remove disposable routines. Do not clear real app data.
7. State explicitly that emulator evidence does not establish reliability on a physical Android device, vendor battery policies, or iOS.
