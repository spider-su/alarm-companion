> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/release-checklist.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Hobby app release checklist

## New project
- [ ] Run `npm run init:app -- "My App" my-app com.example.myapp com.example.myapp` on a fresh clone
- [ ] Review app.config.ts, .env, app icons, splash and permissions
- [ ] Replace demo screens and remove unused native permissions/features
- [ ] Confirm no credentials or personal data are committed
- [ ] Run `npm ci`, `npm run ci` and `npx expo-doctor`

## Device acceptance
- [ ] Run `.codex/skills/ios-simulator-smoke/SKILL.md` on macOS/Xcode; record iOS Simulator evidence separately from real-device testing
- [ ] Install CI-generated Android APK and launch it offline
- [ ] Test Android gesture and three-button navigation, keyboard and system insets
- [ ] Test light/dark mode, large font scaling, screen reader and small screen
- [ ] Verify EN/PL text and persistence after process restart
- [ ] Verify permission denied/unavailable states (biometrics/notifications)
- [ ] Test data creation, editing, deletion, recovery from malformed local data
- [ ] Capture device model, OS version, artifact SHA and date in PR

## Distribution (only if applicable)
- [ ] Verify unique app IDs, version and signing configuration
- [ ] Verify release build, privacy policy, support link and store metadata
- [ ] Test the exact release artifact before distributing
