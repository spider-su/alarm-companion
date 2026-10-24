---
name: mobile-quality-checks
description: Run Alarm Companion quality checks before PR review, including TypeScript, lint, tests, Expo Doctor and Android build evidence.
---

# Alarm Companion quality checks

1. Record branch, commit and working-tree status; preserve uncommitted work.
2. Run `npm ci`, `npm run ci`, and `npx expo-doctor`. Report exact failures and any unavailable commands.
3. Inspect `.github/workflows/mobile-ci.yml` and the latest run. The Android job builds a standalone release-variant test APK signed with the debug key, **not** a store-ready release.
4. For native changes, check Android build results and use `android-emulator-smoke` when an emulator is available.
5. Do not claim exact-alarm, TTS, reboot recovery, iOS or physical-device behavior based on unit tests or APK compilation alone.
6. Report test evidence, skipped checks and remaining risks in the PR.
