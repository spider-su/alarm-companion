# Mobile template adoption map

This app already has product-specific components and native Android alarm modules. Do not copy generic template storage, navigation, notifications, biometrics or voice adapters into it.

- Screens: src/screens/; retain Stage 7 user journeys and accessible controls.
- Domain: src/data/; preserve routine and voice formats.
- Audio/native: src/audio/ and src/native/; never replace alarm delivery with generic Expo notifications.
- Platform safe areas: src/platform/safeArea.ts; keep existing ownership.
- CI: .github/workflows/mobile-ci.yml; standalone release-variant test APK assembled by Gradle on GitHub runner, signed with debug key.
- Android verification: use .codex/skills/android-emulator-smoke/SKILL.md, then test actual scheduled voice playback on a physical device.
- iOS verification: .codex/skills/ios-simulator-smoke/SKILL.md; iOS simulator cannot validate Android exact alarms.

Prefer small component improvements in the existing screens: disabled/busy accessibility, labelled fields, readable errors and explicit destructive confirmation. Do not introduce a parallel component framework while Stage 7 redesign is underway.

Validation: npm ci; npm run ci; npx expo-doctor; GitHub runner standalone APK build; targeted native alarm smoke. See docs/architecture.md for ownership and .codex/SKILLS.md for repeatable workflows. Report unverified device behavior explicitly.

## POC hardening adopted from the mobile template

See [mobile POC hardening](mobile-poc-hardening.md) for visible/hidden tab safe-area ownership, Settings scroll/reset, consistency and idempotent updates, native device regression, and Play AAB upgrade checks. Adopt the patterns in existing components, not by importing another app's navigation or storage layer.
