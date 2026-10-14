# Alarm Companion Codex workflows

- [iOS Simulator smoke](skills/ios-simulator-smoke/SKILL.md): local simulator navigation and UX regression, using disposable data.
- Android debug APK: .github/workflows/mobile-ci.yml builds locally using Expo prebuild and Gradle; downloadable GitHub Actions artifact.

Preserve project-specific native Android alarm testing. A compiled APK does not verify scheduled speech playback.
