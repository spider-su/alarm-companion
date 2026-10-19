# Alarm Companion architecture and ownership

This is a personal/family, offline-first alarm application, not a generic starter or enterprise platform. Follow [engineering level](engineering-level.md) and [mobile reuse map](mobile-agent-reuse.md). Inspect source code before trusting documentation.

| Concern | Owner | Guardrail |
|---|---|---|
| App identity and native permissions | `app.config.ts`, `plugins/withAlarmCompanion.js` | Preserve package identity and Android alarm permissions |
| Navigation and bottom safe area | `src/navigation.tsx`, `src/platform/safeArea.ts` | Shell owns top inset; tabs own bottom; modal owns its own edges |
| Screen flows | `src/screens/` | Keep forms and routine UX accessible and compact |
| Routine and voice persistence | `src/data/` | Preserve migration, stored IDs, family data and local recordings |
| Audio sequencing | `src/audio/` | Preserve sound fade, ducking and spoken playback |
| Android alarm bridge | `src/native/alarmCompanion.ts` | Use the typed native API, not ad hoc notification scheduling |
| Android alarm engine | `modules/alarm-companion/` | Preserve exact alarms, recovery, snooze, dismiss and lock-screen behavior |
| Tests and APK build | `src/**/*.test.ts`, `.github/workflows/mobile-ci.yml` | CI is not proof of real-device alarm delivery |

## Dependency direction

Screens coordinate domain data and native bridges. Domain helpers should remain independently testable. Keep native Android implementation inside the Expo module and its config plugin. Do not import the mobile template's generic notifications or storage adapter to replace alarm-specific behavior.

## Workflow

Read `AGENTS.md`, this map, `docs/mobile-agent-reuse.md`, the relevant source and tests, then `.codex/SKILLS.md`. Make focused changes, run `npm run ci` and `npx expo-doctor` where available, and use the Android emulator smoke skill for runtime checks. Physical-device alarm verification is a separate gate.
