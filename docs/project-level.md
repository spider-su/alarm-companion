> Reference adapted from [mobile_template](https://github.com/spider-su/mobile_template/blob/main/docs/project-level.md). This document describes reusable conventions; Alarm Companion native alarms, voice recordings, and persisted family data take precedence.

# Hobby project scope

This template targets personal apps, experiments and small hobby projects developed with coding agents. Prioritize working features, pleasant mobile UX, understandable code and low maintenance. Enterprise readiness is not a default requirement.

## Defaults
- Keep one simple Expo application and reuse existing components.
- Prefer local state and local persistence; add a backend only when the requested feature needs one.
- Add focused tests for meaningful behavior, not arbitrary coverage targets.
- Prefer free or low-cost services. Avoid new operational infrastructure without a demonstrated need.
- Keep pull requests focused and documentation proportional to the change.

## Avoid speculative complexity
Do not add microservices, CQRS, event sourcing, generic plugin frameworks, dependency injection containers, complex layered architectures, elaborate monitoring, tracing, feature flag platforms, extensive deployment environments, complicated CI matrices, load testing or elaborate permission systems unless explicitly required by the app.

## Minimum quality remains mandatory
Avoid broken flows, data loss, leaked secrets, misleading success states and unhandled common errors. Validate inputs, handle storage failures and verify relevant mobile behavior when tools are available.

## Decision test
Before introducing a new service, abstraction, dependency or non-functional requirement, identify the current user story or demonstrated failure it solves, compare the simplest existing-code alternative and estimate maintenance cost. If no current need exists, defer it.

Stronger controls may be justified by actual payments, sensitive information, public accounts, regulatory requirements or other explicit product needs. Those are exceptions, not defaults.
