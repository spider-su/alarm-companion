---
name: ios-simulator-smoke
description: Smoke-test Alarm Companion on an iOS Simulator with disposable synthetic routines.
---

# iOS Simulator smoke

1. Require macOS, Xcode and an available iOS simulator; otherwise report BLOCKED.
2. Record commit, simulator model, iOS and Xcode versions. Work on a disposable simulator.
3. Run npm ci, npm run ci and npx expo-doctor; then npx expo run:ios --device <SIMULATOR_UDID>.
4. Test startup, Home, Routines, Family, Settings, routine creation/editing, voice library navigation, permissions copy, keyboard and accessibility.
5. Use synthetic family names and voice recordings. Do not clear real user data or upload private audio.
6. Capture evidence with xcrun simctl io <UDID> screenshot <path>.
7. Report PASS/FAIL/BLOCKED/SKIPPED and limitations. iOS simulator cannot verify Android exact alarms, lock-screen activity or physical-device scheduled voice playback.
