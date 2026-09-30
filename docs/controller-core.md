# Stage 15 — Controller Core

Stage 15 defines the platform-independent controller boundary.

## Responsibilities

- normalize controller button actions;
- maintain independent state per controller id;
- discover target-specific controller adapters;
- poll adapter devices;
- keep platform targets isolated.

## Boundaries

The Controller Core does not know about Web APIs, Android APIs, Telegram APIs, UI widgets or any emulator implementation.

Adapters implement the target-specific boundary:

- `web`
- `android-native`
- `telegram`
- `custom`

A controller device emits normalized `press` and `release` actions. The core stores the current button state independently for every controller.

No game, emulator, module or platform is hard-coded into the core.

## Lifecycle

`created → ready → running → stopped`

The core can be reset without unregistering adapters.

Stage 13 NES controller input remains an emulator-specific reference adapter. Stage 15 does not couple the general Controller Core to NES.
