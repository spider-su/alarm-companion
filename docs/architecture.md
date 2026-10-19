> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/architecture.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Architecture and ownership map

Read this before adding a feature. The repository is an Expo SDK 57 / React Native 0.86 hobby-app starter, not a production domain application.

## Startup and runtime

`App.tsx` is the root composition entry. `src/navigation.tsx` owns the NavigationContainer and bottom tabs. `src/screens/` contains route-level UI and local orchestration. `src/ui/` contains reusable, product-agnostic components, palette, localization, validation and optional feature adapters. `src/services/` contains pure data operations and storage abstractions. `src/platform/` contains platform-specific behavior and safe-area contracts. `app.config.ts` reads non-secret app identity and native plugin configuration from environment variables.

## Ownership rules

| Concern | Owner | Agent rule |
|---|---|---|
| App name, IDs, native plugins | `app.config.ts`, `.env.example` | Do not hardcode another app's identity or commit secrets |
| Tabs, navigation and bottom inset | `src/navigation.tsx` | Register new tabs here; avoid second bottom inset in screens |
| Screens and user flows | `src/screens/` | Compose existing primitives; keep storage/model rules outside JSX |
| Generic design system | `src/ui/theme.ts`, `src/ui/primitives.tsx` | Reuse before adding components or dependencies |
| Text and language | `src/ui/i18n.ts`, `LanguageContext.tsx` | Add both EN and PL keys; no hardcoded production copy |
| Validation | `src/ui/validation.ts` or pure feature model | Keep rules independently testable |
| Persistence | `src/services/storage.ts`, `storageBackends.ts` | Namespace keys, handle corrupt data, surface write errors |
| Demo CRUD | `src/services/exampleItems.ts`, `src/screens/ExamplesScreen.tsx` | Reference example only; replace with product domain |
| Native quality evidence | `.codex/skills/` | Tests/builds are not proof of real-device behavior |

## Dependency direction

Screens may depend on UI, services and platform helpers. UI primitives must not depend on screens or app-domain models. Pure services should not import React components. Platform helpers must remain isolated and tested. Do not add a state-management library, router, database, analytics or auth SDK merely because it is common elsewhere.

## Safe areas and errors

The app shell owns the top inset, tab navigator owns bottom inset, and modal content owns its own edges. Avoid double padding. Error boundaries catch render errors, not rejected promises; async storage/network failures require explicit UI states. Do not claim biometric verification is an app lock.

## How to navigate unfamiliar code

Start with `AGENTS.md` -> this map -> `docs/component-catalog.md` -> the relevant source file -> colocated tests -> `docs/agent-workflow.md`. Inspect current code before following documentation if they differ. Update documentation when contracts change.
