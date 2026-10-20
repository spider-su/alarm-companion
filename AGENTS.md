# Alarm Companion agent guidance

Alarm Companion is a focused personal/family alarm app. Read [architecture](docs/architecture.md), [engineering level](docs/engineering-level.md), [mobile reuse guide](docs/mobile-agent-reuse.md), and [Stage 7 UX audit](docs/stage7-ux-audit.md).

- Keep the existing native Android alarm engine, scheduled audio and speech, family routines and voice library. Never replace reliable alarms with browser or generic notification behavior.
- Prefer focused UX improvements and existing components; do not add enterprise-style abstractions or a duplicate design system.
- Protect private voice recordings and persisted family routines. Use synthetic data in tests and never delete real user data during validation.
- Run npm ci, npm run ci, and npx expo-doctor when available. Check local Gradle APK CI and verify actual scheduled alarm speech on a physical Android device before claiming alarm reliability.
- Android emulator smoke: .codex/skills/android-emulator-smoke/SKILL.md. Emulator results do not prove physical-device alarm reliability.
- Mobile quality checks: .codex/skills/mobile-quality-checks/SKILL.md.
- iOS simulator smoke: .codex/skills/ios-simulator-smoke/SKILL.md. iOS results do not prove Android exact alarm behavior.
- Keep PRs reviewable and report CI/device test limitations. Human approval for merge.

## Shared mobile-template conventions

For new UI or agent-driven work, consult [architecture](docs/architecture.md), [component catalog](docs/component-catalog.md), [UI kit](docs/ui-kit.md), and [agent workflow](docs/agent-workflow.md). Use [agent handoff](docs/agent-handoff.template.md) for multi-session work and [release checklist](docs/release-checklist.md) before distribution.

The [template project-level policy](docs/project-level.md) complements the app-specific [engineering level](docs/engineering-level.md). Existing native alarm and notification code is authoritative over generic template examples. Do not copy the template app identity, dependencies, or CI workflow over the app's working standalone APK build.

For behavior changes add focused tests and report actual commands/results; run Expo Doctor when tooling permits. Keep private recordings and routine data out of test fixtures.
