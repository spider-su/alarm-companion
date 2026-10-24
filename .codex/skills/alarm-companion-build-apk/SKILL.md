---
name: alarm-companion-build-apk
description: Build and validate the standalone local Android release APK for Alarm Companion. Use when asked to build or refresh a local APK; this does not publish or install it.
---

# Build standalone Alarm Companion APK

Run from the repository root, or pass the root as the script's first argument:

```sh
./.codex/skills/alarm-companion-build-apk/scripts/build_apk.sh [repo-root]
```

The helper regenerates Android native files from `app.config.ts`, builds
`assembleRelease`, checks the embedded JS bundle, APK structure, signer, and
package ID, then atomically writes `artifacts/app/alarm-companion.apk`. A
failed build leaves any previous artifact in place. It does not upload or
install the APK.

Project invariants:

- Expo app: `alarm-companion`; Android application ID: `com.spidersu.alarmcompanion`.
- Use JDK 17. Resolve from `JAVA_HOME`, `/usr/libexec/java_home -v 17`, or the
  local SDKMAN candidates under `/Users/alex/.sdkman/candidates/java/17*`.
- Use `ANDROID_SDK_ROOT`, `ANDROID_HOME`, or
  `/opt/homebrew/share/android-commandlinetools` and export both SDK variables.
- Release APK signing uses the generated local debug key and is for QA/sideload
  only, not Play Store distribution. Never create, overwrite, or reuse a
  production keystore for this workflow.
- Do not change app identity, version, permissions, or build profiles to make a
  local build succeed.
- Do not add the built APK to Git unless asked separately.

Report output path, size, SHA-256, package ID, signature verification, and the
fact that a successful build alone is not emulator/device proof.
