# Component ledger

This ledger distinguishes source-tested behavior from coverage provided by this starter. Update it when the template changes.

| Component | Source / contract | Test evidence | Compatibility / adoption |
|---|---|---|---|
| App shell owns top safe area; bottom belongs to tab navigation | Both Ryczałt apps; safe-area ownership helpers | Source repos have focused edge ownership tests | Expo 57 / RN 0.86 baseline; use the helper consistently in each screen |
| Tab bar adds the reported bottom inset once and enforces minimum padding when inset is zero | Shared behavior; height and spacing remain app-configurable | Focused source tests in both apps; starter tests cover positive, zero, and negative inset inputs | Compare tab sizing with product design before adoption |
| Modal/fallback screens account for system edges | Both apps' modal/safe-area conventions | Edge contract source tests; starter tests cover edge constants and modal padding | Modal windows need their own safe area; avoid consuming the same inset twice |
| Theme, auth, API, persistence, notifications, telemetry, release identity | Intentionally omitted from starter | Not applicable | Add and verify per app; do not copy app credentials or product semantics |

## Validation status

- Source-level safe-area contract and unit tests: present in both source apps; starter has equivalent focused tests.
- Automated validation: this starter's CI result is recorded in the initial commit/release notes and GitHub Actions.
- Android three-button navigation: not claimed as verified by the source port audit; validate on a device/emulator using that mode.
- iOS simulator safe areas: not claimed as verified by the source port audit; validate in simulator.
- Physical-device, store-build, and live-service behavior: not established by unit tests or CI.

For each future component, replace generic status with dated evidence and the device/OS/configuration used. A test passing in one app does not prove the receiving app adopted it correctly.
