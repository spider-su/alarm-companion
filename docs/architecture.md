# Alarm Companion architecture and ownership

Alarm Companion is a personal and family alarm app. Its native Android alarm engine, local routine and voice data, and scheduled audio behavior are app-specific and authoritative. Shared mobile-template documents are references only; they do not imply that template components or services exist here.

| Concern | Owner | Guardrail |
|---|---|---|
| App identity and native permissions | `app.config.ts`, `plugins/withAlarmCompanion.js` | Preserve package identity and Android alarm permissions |
| Navigation and safe areas | `src/navigation.tsx`, `src/platform/safeArea.ts` | Shell owns top inset; tabs own bottom; modal owns its own edges |
| Screens and user flows | `src/screens/` | Keep routine flows accessible and compact |
| Routine and voice persistence | `src/data/` | Preserve stored IDs, migrations, family data and local recordings |
| Audio sequencing | `src/audio/` | Preserve sound fade, ducking and speech playback |
| Android alarm bridge | `src/native/alarmCompanion.ts` | Use the typed native API |
| Android alarm engine | `modules/alarm-companion/` | Preserve scheduling, recovery, snooze, dismiss and lock-screen behavior |
| Tests and APK build | `src/**/*.test.ts`, `.github/workflows/mobile-ci.yml` | CI and APK builds do not prove real-device alarm delivery |

## Dependency direction

Screens coordinate domain data and native bridges. Keep domain rules independently testable and native alarm implementation inside the Expo module and its config plugin. Do not replace alarm delivery or private recording storage with generic template services.

## Safe areas and errors

The app shell owns the top inset, the tab navigator owns the bottom inset, and modal content owns its own edges. Avoid applying the same inset twice. Render error boundaries do not catch failed async storage calls, so handle those failures in the relevant flow.

## Workflow

Read `AGENTS.md`, this map, `docs/mobile-agent-reuse.md`, relevant source and tests, then `.codex/SKILLS.md`. Use the Android emulator skill for runtime checks. Physical-device alarm verification is a separate gate.
