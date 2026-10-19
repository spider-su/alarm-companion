> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/agent-workflow.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Agent development playbook

## Start of every task
1. Read `AGENTS.md`, `docs/architecture.md`, `docs/component-catalog.md` and the files relevant to the request.
2. Inspect `git status`, branch, recent commits and existing tests. Preserve uncommitted changes and never rewrite history without permission.
3. Restate acceptance criteria in a short implementation plan. Identify whether the change belongs to the **template** or a **downstream app**.
4. Search for an existing component, service and test before writing a new one. Prefer the smallest implementation.

## Implementation loop
1. Make one focused change at a time. Keep pure logic outside screens.
2. Reuse theme, language, storage and safe-area contracts. Avoid dev-only controls in production-facing screens.
3. Add focused unit tests for validation, persistence and edge cases. Handle loading, empty, failure and permission-denied states.
4. Update `docs/component-catalog.md`, `docs/component-ledger.md` and README when public reusable contracts change.
5. Run `npm ci` when needed, `npm run ci`, and `npx expo-doctor`. If unavailable, state why rather than claiming success.
6. For UI/native changes, use the Android or iOS Simulator skill in `.codex/skills/` where the host supports it. Include screenshots and device/runtime details. Never claim physical-device verification from simulator results.

## PR definition of done

Report: goal and scope; files/components reused vs added; tests and exact commands/results; screenshots or emulator evidence; migration/config changes; known limitations; any remaining work. Open a focused PR against the agreed branch; do not merge without human approval. Keep CI green before marking READY.

## Prompt template for a new app

> Build [app goal] from this starter. First inspect AGENTS.md, docs/architecture.md, docs/component-catalog.md and docs/project-setup.md. Preserve the existing navigation, safe-area and theme contracts. Replace demo screens only as needed. Implement [feature list] with reusable primitives, local-first persistence where appropriate, EN/PL text, unit tests, and Android/iOS simulator evidence when available. Keep third-party services opt-in. Run quality checks, document unverified scenarios, and create a reviewable PR; do not merge.

## Prompt template for a feature

> Implement [user story] in [screen/area]. Inspect existing primitives and storage adapters before adding dependencies. Acceptance criteria: [observable behaviors], [error/empty/loading states], [restart behavior], [EN/PL and accessibility], [tests]. Update documentation only for changed contracts. Run npm run ci and relevant simulator skill; report evidence and open a PR.

## Prompt template for review

> Review the diff against AGENTS.md, docs/architecture.md and docs/component-catalog.md. Prioritize correctness, security/privacy, safe-area ownership, persistence failures, accessibility, localization and tests. Report concrete file/line findings and missing verification. Do not rewrite unrelated code.
