# Engineering level

Alarm Companion is a small personal/family alarm app, not an enterprise platform. Adapted from mobile_template.

Prioritize reliable wake-up alarms, understandable everyday controls, fast iteration and maintainable code. Reuse existing routine, voice, family, audio and native scheduling flows. Avoid unnecessary architecture, generic state frameworks, microservices, duplicate UI systems, speculative configuration and infrastructure.

Reliability exceptions are mandatory: exact-alarm permissions, background delivery, lock-screen behavior, scheduled speech playback, audio focus, persistent routines, accessibility, privacy of recordings and safe migrations must not be weakened. Android alarm correctness requires physical-device evidence, not just unit tests or emulator startup.

Preserve the Stage 7 UX plan in docs/stage7-ux-audit.md. Keep Home, Routines, Family, Settings understandable and minimize developer-facing settings.
