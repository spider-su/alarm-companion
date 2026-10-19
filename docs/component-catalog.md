> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/component-catalog.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Reusable component catalog

This is an index, not a substitute for TypeScript signatures. Inspect the linked source before modifying or consuming a component.

| Component / helper | Location | Contract / when to reuse |
|---|---|---|
| `AppScreen` | `src/ui/primitives.tsx` | Safe-area-aware scrollable screen with shared spacing; tab bar owns bottom inset |
| `AppCard` | `src/ui/primitives.tsx` | Bordered surface for grouped content |
| `AppText` | `src/ui/primitives.tsx` | Theme-aware body/title text |
| `AppButton` | `src/ui/primitives.tsx` | Primary/secondary action, disabled and busy states |
| `TextField` | `src/ui/primitives.tsx` | Labeled controlled input with validation error |
| `ToggleField` | `src/ui/primitives.tsx` | Accessible boolean setting |
| `LoadingSpinner` | `src/ui/primitives.tsx` | Busy state with label |
| `FeedbackBanner` | `src/ui/primitives.tsx` | Local info/error feedback; **not** an OS notification |
| `ConfirmDialog` | `src/ui/primitives.tsx` | Confirmation before destructive actions |
| `usePalette`, `spacing` | `src/ui/theme.ts` | Shared light/dark colors and spacing tokens |
| `useLanguage`, `translate` | `src/ui/LanguageContext.tsx`, `i18n.ts` | EN/PL strings and saved language preference |
| `validateDemoForm` | `src/ui/validation.ts` | Example of pure validation; replace with product rules |
| `createStorage` | `src/services/storage.ts` | Namespaced JSON get/set/remove; returns null on corrupt JSON |
| `nativeStorageBackend`, `webStorageBackend` | `src/services/storageBackends.ts` | Platform persistence adapters; native accepts AsyncStorage contract |
| `parseItems`, `saveItem`, `deleteItem` | `src/services/exampleItems.ts` | Pure example CRUD model; not a database |
| `AppErrorBoundary` | `src/components/AppErrorBoundary.tsx` | Render-crash fallback, not async error handling |
| Safe-area helpers | `src/platform/safeArea.ts` | Single-inset ownership for shell/tab/modals |
| Biometrics | `src/ui/biometrics.ts` | Optional identity prompt, **not** authorization or credential storage |
| Notifications | `src/ui/notifications.ts` | Optional contract; no automatic push permission or delivery |

## Copyable implementation pattern

For a new local-first feature: define the pure model in `src/services/`, add tests, create a screen in `src/screens/` using existing primitives, use `createStorage` with a unique namespace and versioned key, register navigation in `src/navigation.tsx`, add EN/PL strings, and verify restart persistence. The Examples tab demonstrates this composition. Keep domain code in the receiving app rather than adding it to the shared starter.

## Extension decision

Reuse the current primitive when its behavior matches. Extend it when at least two flows need the same generic behavior and tests can cover it. Keep app-specific widgets inside the app. Add new dependencies only after checking native compatibility and documenting why existing primitives are insufficient. Update `docs/component-ledger.md` for shared contract changes.
