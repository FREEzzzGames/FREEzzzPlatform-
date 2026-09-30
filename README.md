# FREEzzz Platform

A new modular platform built from zero.

## Project law

Development follows the corrected 31-stage master plan strictly in order. Every completed action is checked against the plan before the next stage begins.

**Current stage: 20 — LIBRARY Module**

## Core principles

- Unlimited independent cores.
- Self-contained modules.
- No direct module-to-module coupling.
- Web, Android, Telegram and future targets are isolated through adapters.
- Performance and emulation capability have priority over decorative graphics.
- UI is minimal and uses no decorative drawings or emoji.
- No portal-wide economy.

## Current foundation scope

Stages 1–13 establish the runtime, modular foundation, SDK, emulator architecture, high-performance boundary and first NES reference emulator. Stage 14 adds a storage-backed Save API for both Battery Save and Save State without coupling saves to a game, emulator, UI or target platform. Stage 15 adds a platform-independent Controller Core with normalized input state and target-specific adapters. Stage 16 adds a platform-independent Audio Core with normalized PCM buffers and target-specific audio adapters. Stage 17 adds an independent CHAT module with normalized conversations, messages and target-specific transport adapters. Stage 18 adds an independent LIVE module with normalized stream metadata, playback state and target-specific player adapters. Stage 19 adds an independent RADIO module with normalized station metadata, playback state and target-specific player adapters. Stage 20 adds an independent LIBRARY module with catalog, query and target-specific storage boundaries.

No UI or portal economy is implemented at this stage.

See docs/master-plan.md, docs/save-system.md, docs/controller-core.md, docs/audio-core.md, docs/chat-module.md, docs/live-module.md, docs/radio-module.md and docs/library-module.md.
