# Stage 7 consumer UX audit

## Current journeys

- **Create a routine:** Home/Routines → Add routine → choose a template or blank → complete a long editor with routine type, reminder behavior, name, manually entered time, repeat days, family assignment, voice, message variants, tone, audio settings, and preview → Save. Enabling is a separate editor switch.
- **Change a routine:** tap its card → edit in the same full editor. The card itself also shows Preview, enabled state, completion/undo, and Skip today actions.
- **Choose a voice:** open the Voices tab or Settings → Voice Library → distinguish reusable profiles, private recordings, and Android TTS voices; preview, assign, rename, import, record, and delete actions are visible together.
- **Manage family:** choose a profile chip on Home, then open Manage to edit names, motivation settings, and profile membership. Profile management is embedded in the routine dashboard.
- **Check progress:** open the Progress tab. Home also shows a progress card and two recent-activity entry points.
- **Resolve permissions:** Settings presents notification, exact-alarm, and full-screen access details. It includes direct actions, plus voice tests, defaults, audio preview, and reset/diagnostic information.

## Findings

- Navigation is currently **Routines, Settings, Progress, Voices**. There is no distinct Home or Family destination; Progress and Voice Library compete with daily alarm management.
- `HomeScreen` owns dashboard content, routine persistence/scheduling, family editing, completion and history, template selection, routine editing, previews, and the active alarm modal. Its dense inline rendering makes hierarchy and focused iteration difficult.
- Routine cards combine edit-on-tap with a switch and up to four text actions (Preview, completion/undo, Skip today), alongside schedule, sound, voice, and family metadata.
- The dashboard duplicates Recent activity access and displays progress for a feature that should be secondary.
- Routine creation/editing uses manual HH:MM entry and exposes many choices in one screen. This is 7B scope; existing data and editor behavior must remain intact during 7A.
- Voice Library puts everyday profile choice beside recording management, file handling, and installed TTS voice configuration. Its offline private storage and consent behavior must be preserved; simplification is 7C scope.
- Settings explains Android permission implementation in long technical detail and mixes permissions, voice testing, defaults, diagnostics, and reset. Simplification is 7C scope.
- Android relies on native alarm scheduling and platform permissions; web has different notification, recording, and playback capabilities. Do not imply browser alarms are equivalent to Android alarms.
- Existing styles are local to each screen. The routine card and editor already share data and persistence through `Routine`; avoid a global state or UI framework.

## PR 7A plan

1. Add a real Home dashboard for the next enabled alarm, a short chronological view of today's routines, a useful empty state, and one primary Add action.
2. Keep the current routine management/editor flow as the Routines destination, but simplify routine cards to tap-to-edit, a separate enable switch, and at most one contextual completion action.
3. Move profile editing into a Family destination; remove progress and duplicate history controls from the main dashboard. Keep achievements and Voice Library reachable as secondary screens from Settings instead of primary tabs.
4. Use four primary tabs: Home, Routines, Family, Settings. Reuse existing storage, scheduling, playback, and voice/profile data formats.
5. Preserve current creation/editing behavior for 7B and leave voice/settings redesign for 7C. Do not change the native audio engine.

## Known validation risk

A user-reported physical Android check on 2026-10-10 confirmed that voice preview and voice selection worked and that an alarm scheduled for 19:56 fired, but the scheduled alarm did not play its voice message. The device model, Android version, app state, and alarm configuration were not recorded. Treat scheduled voice playback as a known regression risk; this UX pass does not claim to fix or re-validate it.
