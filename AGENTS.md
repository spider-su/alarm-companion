# Alarm Companion agent guidance

Alarm Companion is a focused personal/family alarm app. Read [engineering level](docs/engineering-level.md), [mobile reuse guide](docs/mobile-agent-reuse.md), and [Stage 7 UX audit](docs/stage7-ux-audit.md).

- Keep the existing native Android alarm engine, scheduled audio and speech, family routines and voice library. Never replace reliable alarms with browser or generic notification behavior.
- Prefer focused UX improvements and existing components; do not add enterprise-style abstractions or a duplicate design system.
- Protect private voice recordings and persisted family routines. Use synthetic data in tests and never delete real user data during validation.
- Run npm ci and npm run ci. Check local Gradle APK CI and verify actual scheduled alarm speech on a physical Android device before claiming alarm reliability.
- iOS simulator smoke: .codex/skills/ios-simulator-smoke/SKILL.md. iOS results do not prove Android exact alarm behavior.
- Keep PRs reviewable and report CI/device test limitations. Human approval for merge.
