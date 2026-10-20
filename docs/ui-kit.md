> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/ui-kit.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Mobile UI Kit showcase

Launch with `npm ci && npm start`, then open the Home and Settings tabs. Home demonstrates buttons, an activity spinner, an accessible validation form, a switch, a confirmation dialog, native alert and in-app feedback.

## Reuse

- `src/ui/theme.ts`: light/dark palette and spacing.
- `src/ui/primitives.tsx`: screen, card, text, buttons, fields, toggle, spinner, banner, dialog.
- `src/ui/validation.ts`: example pure form validation; replace domain rules when adopting.
- `src/ui/notifications.ts`: optional interface for a product-owned OS notification implementation. The template intentionally does not install or configure expo-notifications, request OS permission, or pretend in-app banners are push notifications.
- `src/services/storage.ts`: existing opt-in typed persistence. The sample form is deliberately ephemeral; apps must choose a native or web storage backend and migration policy.

## Validation

Run `npm run ci` and `npx expo-doctor`. Confirm keyboard avoidance, dark mode, system text scaling, Android back behavior, three-button navigation, and small-screen scrolling on devices/emulators. CI unit tests are not device evidence.

## Adoption rule

Keep product-specific form rules, branding, persistence keys, secrets, API endpoints and notification permissions in the receiving app. Do not install extra state management or form dependencies for this example.

## CI and APK builds

The Mobile CI workflow runs checks and creates a local Android **debug** APK using Expo prebuild and Gradle on GitHub-hosted runners. Download `mobile-template-debug-apk` from the workflow's Artifacts section (retained for 14 days). This is an installable testing artifact, not a signed Play Store release.

EAS cloud builds are isolated in `EAS Cloud Build (optional)`, triggered manually or by a `v*` tag. They require an `EXPO_TOKEN` repository secret and a configured `eas.json`; no cloud build is attempted during ordinary PR or main CI. Cloud quota limits therefore do not affect the local APK job. A `--no-wait` cloud dispatch only confirms that the build was queued, not that a cloud artifact succeeded.

## Languages and biometric verification

The Home, Settings, About and tab labels are available in English and Polish. The default is inferred from the runtime locale when available; the selection is saved with AsyncStorage under `mobile-template.language.v1` and restored on launch. Invalid or inaccessible stored values fall back to the default. This preference is not a secret.

The biometric check is based on `spider-su/ryczalt_it/apps/mobile/src/auth/biometric.ts`: it checks hardware and enrollment, then requests a native Expo LocalAuthentication prompt. It reports verified, failed/cancelled or unavailable and never stores biometric templates. Web reports unavailable. **It is not an app lock or a replacement for session authorization**. Applications requiring protected credentials should independently use SecureStore's `requireAuthentication` strategy and handle key invalidation/re-enrollment.

Local APK CI requires no Expo account or EAS quota. The cloud workflow is optional and requires configured EAS credentials.
