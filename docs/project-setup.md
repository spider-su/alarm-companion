# App project setup

Use this checklist when turning the starter into an app. Set up only the external services required by the product and release plan.

## Clone, fork, or use as a template

### Clone for an independently owned app

Cloning preserves the template's Git history, so future template fixes can be merged. Create an empty app repository first, then:

```sh
git clone https://github.com/spider-su/mobile_template.git my-mobile-app
cd my-mobile-app
git remote rename origin template
git remote add origin https://github.com/YOUR_ORG/YOUR_APP.git
git push -u origin main
```

Replace the example organization and repository. Keep `template` pointing at the source repository to receive reviewed updates.

### Fork to keep the app visibly connected to the template

Fork this repository in GitHub, clone the fork, and add the source as a second remote:

```sh
git clone https://github.com/YOUR_ORG/YOUR_APP.git
cd YOUR_APP
git remote add template https://github.com/spider-su/mobile_template.git
git fetch template
```

Here `origin` is the app fork and `template` is the source. This keeps the common history for merging updates and makes it easy to propose generic improvements back to the template.

GitHub's **Use this template** button is also fine for a one-off copy, but it does not retain the source history needed for ordinary merges. Use targeted cherry-picks or manually reviewed PRs for updates in that case.

## External services

| Service | Required when | Set up | Keep the integration information in |
|---|---|---|---|
| GitHub or another Git host | Always for shared source and CI | Create the app repository; enable Actions if using the included workflow | Repository settings; workflow definitions in `.github/workflows/` |
| Expo account and EAS project | Only for EAS cloud builds, updates, or submissions | Install/use `eas-cli`, sign in, and run `eas init` for a new project. Use a separate EAS project per app. Put its ID in `EAS_PROJECT_ID`. | `app.config.ts`, `.env.example`, `.env` locally, and EAS project environment variables |
| Apple Developer Program and App Store Connect | Only for iOS device distribution, TestFlight, or App Store release | Register the unique iOS bundle ID, create the store app, and configure signing/submission credentials in EAS or your chosen protected CI | `app.config.ts`, release checklist, and provider credential vault; never commit signing keys |
| Google Play Console | Only for Android store distribution | Register the unique Android application ID and create the Play app. For EAS Submit, configure a Play service account credential in EAS. First-time Play setup may require a manual console step. | `app.config.ts`, `eas.json`, release checklist, and provider credential vault; never commit service account JSON |
| Product API and identity provider | Only if the app uses a backend or sign-in | Create separate development/preview/production environments and app-scoped client configuration. Keep privileged keys and service credentials on the server. | Public base URL/client ID in `.env.example` and EAS variables; API/auth contract in `docs/`; secrets in backend or provider secret storage |
| Push provider credentials (APNs / Firebase Cloud Messaging) | Only if remote push is required | Configure iOS push capability and APNs key; configure Firebase/FCM and the Android app if used. Follow Expo Notifications setup for the selected Expo SDK. | App config/plugins and `docs/`; credentials in EAS or a protected secret/file store, never source control |
| Error monitoring / analytics (for example Sentry) | Optional | Create a separate project per app, decide what data is collected, and configure privacy/consent behavior. | Dependencies in `package.json`, app config, public DSN if needed in EAS variables, upload/auth token as a secret |

The base template does not install an API, authentication, push, store-submit, or monitoring SDK. Add only the needed package/plugin, then test its native permissions and privacy behavior.

## Project files and what to record

| File | Record here |
|---|---|
| `README.md` | App purpose, supported platforms, local start/check commands, owner/contact, and links to API and release docs |
| `app.config.ts` | App display name, slug, unique iOS/Android IDs, app version, icons/splash, permissions, native plugins, and EAS project ID wiring. Do not add credentials. |
| `.env.example` | Names and safe sample values for local config only. Keep it synchronized with every variable read by code or `app.config.ts`. Never put real secrets here. |
| `.env` | Local values only. It is ignored by Git; do not commit or paste secrets into issues/PRs. |
| `eas.json` | Build profiles and non-secret profile behavior. Keep environment-specific values in EAS environments rather than hardcoding API origins or credentials. |
| `.github/workflows/` | Automated source checks. Add GitHub secrets only if a workflow actually needs them; the included CI workflow needs none. |
| `docs/project-setup.md` | External-service owners, project links/IDs that are safe to share, environment names, where credentials are held, and setup state. Never record credential values. |
| `docs/component-ledger.md` | Shared platform modules, their contracts, tests, compatibility, and device evidence. |
| `docs/release-checklist.md` (create per app) | Store listing owner, privacy policy URL, support URL, app IDs, signing/submission setup status, and tested release artifact details. Do not store signing material. |

Put shared, non-secret environment values in EAS per environment. For example, configure `APP_NAME`, `APP_SLUG`, `APP_VERSION`, `IOS_BUNDLE_IDENTIFIER`, `ANDROID_PACKAGE`, and `EAS_PROJECT_ID` for development, preview, and production. Set `EXPO_PUBLIC_API_URL` only when the app has an API and use its correct origin for each environment. Values prefixed with `EXPO_PUBLIC_` are compiled into the client and must be treated as public. EAS secrets are for build/workflow-only credentials; they do not make a value secret after it is embedded in the app.

Local setup:

```sh
cp .env.example .env
# Edit .env for the app, then:
npm ci
npm run ci
npx expo config --type public
npx expo-doctor
```

For EAS builds, set the same app configuration variables in the selected EAS environments, then use `npx eas-cli build --profile preview --platform all` or `npx eas-cli build --profile production --platform all`. Configure native signing only when building for an installable release. A successful CI run or cloud build is not device or store validation.

## Service-specific references

- [Expo app configuration](https://docs.expo.dev/workflow/configuration/)
- [EAS Build profiles](https://docs.expo.dev/build/eas-json/)
- [EAS environment variables and visibility](https://docs.expo.dev/eas/environment-variables/)
- [EAS Submit for Android](https://docs.expo.dev/submit/android/)
- [Submit to app stores](https://docs.expo.dev/deploy/submit-to-app-stores/)
