# FREEzzz Platform

A new modular platform built from zero.

## Project law

Development follows the corrected 31-stage master plan strictly in order. Every completed action is checked against the plan before the next stage begins.

**Current stage: 25 — Patch System**

## Core principles

- Unlimited independent cores.
- Self-contained modules.
- No direct module-to-module coupling.
- Web, Android, Telegram and future targets are isolated through adapters.
- Performance and emulation capability have priority over decorative graphics.
- UI is minimal and uses no decorative drawings or emoji.
- No portal-wide economy.

## Current foundation scope

Stages 1–13 establish the runtime, modular foundation, SDK, emulator architecture, high-performance boundary and first NES reference emulator. Stage 14 adds a storage-backed Save API for both Battery Save and Save State without coupling saves to a game, emulator, UI or target platform. Stage 15 adds a platform-independent Controller Core with normalized input state and target-specific adapters. Stage 16 adds a platform-independent Audio Core with normalized PCM buffers and target-specific audio adapters. Stage 17 adds an independent CHAT module with normalized conversations, messages and target-specific transport adapters. Stage 18 adds an independent LIVE module with normalized stream metadata, playback state and target-specific player adapters. Stage 19 adds an independent RADIO module with normalized station metadata, playback state and target-specific player adapters. Stage 20 adds an independent LIBRARY module with catalog, query and target-specific storage boundaries. Stage 22 adds the Telegram target boundary with normalized updates/messages, client adapters and update routing without direct module coupling. Stage 23 adds the Android target boundary with host adapters, normalized lifecycle events/intents and window information without Android SDK coupling. Stage 24 adds GitHub Actions verification for typecheck and tests. Stage 25 adds the platform-independent Patch System with validated add/replace/remove operations and patch history.

No UI or portal economy is implemented at this stage.

See docs/master-plan.md, docs/save-system.md, docs/controller-core.md, docs/audio-core.md, docs/chat-module.md, docs/live-module.md, docs/radio-module.md, docs/library-module.md and docs/telegram-integration.md, docs/android-integration.md and docs/ci-cd.md.
