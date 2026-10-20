# Alarm Companion Codex workflows

- [Mobile quality checks](skills/mobile-quality-checks/SKILL.md): typecheck, lint, tests and Expo Doctor.
- [Android emulator smoke](skills/android-emulator-smoke/SKILL.md): alarm scheduling, voice and navigation regression with disposable routines.
- [Build Android APK](skills/alarm-companion-build-apk/SKILL.md): build and validate the standalone local release APK without installing or publishing it.
- [iOS Simulator smoke](skills/ios-simulator-smoke/SKILL.md): local simulator navigation and UX regression, using disposable data.
- Android standalone test APK: .github/workflows/mobile-ci.yml uses Expo prebuild and Gradle assembleRelease on the GitHub runner; artifact is signed with a debug key and is not a store-ready release.

Preserve project-specific native Android alarm testing. A compiled APK does not verify scheduled speech playback.
