> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/agent-handoff.template.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Agent context handoff

Keep this file short and update it when work is handed to another agent. This is a **template**; replace placeholders in downstream projects.

## Current intent
- Product goal: [describe the app in 1–2 sentences]
- Supported platforms: [Android / iOS / web]
- In scope: [features]
- Explicitly out of scope: [features]

## Current implementation
- Base template version / commit: [SHA]
- Active branch / PR: [branch and link]
- Completed: [verified behavior]
- In progress: [specific changes]
- Known failures / blockers: [command and symptom]

## Decisions
- Navigation: [tabs/stack and ownership]
- Persistence: [backend, namespace, schema/migration]
- External services: [none or named opt-in providers]
- UI / accessibility: [theme, locales, screen sizes]
- Testing: [CI, Android emulator, iOS Simulator, physical device]

## Next agent instructions
1. Read `AGENTS.md`, `docs/architecture.md`, `docs/component-catalog.md`.
2. Check the current git branch and CI rather than trusting stale notes.
3. Continue from [specific task], preserve uncommitted work.
4. Run [specific checks], update this handoff with evidence and unresolved items.

Never put tokens, credentials, personal data or unreviewed assumptions in this document.
