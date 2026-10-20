# Mobile POC hardening — template lessons

Adapted from spider-su/mobile_template PR #6 and Ryczałt mobile POC regressions. This is a lightweight guide, not a new framework.

## Navigation and system insets

- Current visible bottom tabs keep their existing layout: tab bar owns the bottom inset; the app/screen owns the top.
- Only when converting a flow to **hidden tabs** or a no-tab layout, use `appEdgesForNavigation('hidden-tabs')` and ensure the parent does not separately consume the bottom inset. Never double-count the same inset.
- Modals and standalone fallbacks own their own safe areas. Verify Android gesture and three-button navigation, scrolling to the bottom, large text and keyboard behavior.
- Nested sections must have an intentional scroll reset and hardware Back behavior. Preserve selected accounting periods, filters, and unsaved drafts when opening and returning from settings. Do not remount the entire navigator just to reset a ScrollView.
- Remove unreachable tab state, leftover navigation labels, and obsolete screen controls when simplifying the flow.

## State consistency and preservation

- Calculate one derived status for summary/list/detail views from a single authoritative source; don't let screens disagree about confirmed versus outstanding.
- Treat an already-approved record as a durable fact; later edits should not silently overwrite it. Use future-effective changes or an explicit correction flow as appropriate.
- Validate updates against the latest state; serialize concurrent local writes where needed, reject duplicate confirmation and make re-imports idempotent.
- Exercise errors and offline/restart scenarios; never display success before persistence or the backend confirms.
- Preserve previous data on app update; test upgrade-over-install rather than assuming a fresh install represents a safe upgrade.

**App-specific boundary:** Native exact-alarm schedules, permission state, voice assets and routine persistence remain the authoritative app flows. Never replace native alarm delivery with generic notification scheduling. Test actual scheduled speech and alarm firing on physical Android hardware.

## Release and Android regression gate

- Run the repository CI and native Gradle debug APK workflow. A debug APK is not the signed AAB required for Play Store distribution.
- Store releases must keep the same package identity and upload signing identity, and use a higher Android versionCode for every new upload.
- With a disposable emulator: open the deepest settings screen, scroll to bottom, switch section, press Android Back, rotate only if the app supports it, verify system inset and small-screen/large-font layout.
- On a device: verify persistence after force-close and update-over-existing-install, including permissions and native features. Never wipe the user's real app data for testing.
- Record exact commit/build artifact, emulator/device Android version, verified checks, skips and failures; CI green alone is not device evidence.

See [mobile reuse map](mobile-agent-reuse.md) and the repository's existing POC/testing instructions. Do not port tax/rental models or a generic app-wide state framework.
