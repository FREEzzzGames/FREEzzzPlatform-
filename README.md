# FREEzzz Platform

A new modular platform built from zero.

## Project law

Development follows the corrected 31-stage master plan strictly in order. Every completed action is checked against the plan before the next stage begins.

**Current stage: 16 — Audio Core**

## Core principles

- Unlimited independent cores.
- Self-contained modules.
- No direct module-to-module coupling.
- Web, Android, Telegram and future targets are isolated through adapters.
- Performance and emulation capability have priority over decorative graphics.
- UI is minimal and uses no decorative drawings or emoji.
- No portal-wide economy.

## Current foundation scope

Stages 1–13 establish the runtime, modular foundation, SDK, emulator architecture, high-performance boundary and first NES reference emulator. Stage 14 adds a storage-backed Save API for both Battery Save and Save State without coupling saves to a game, emulator, UI or target platform. Stage 15 adds a platform-independent Controller Core with normalized input state and target-specific adapters. Stage 16 adds a platform-independent Audio Core with normalized PCM buffers and target-specific audio adapters. Stage 17 adds an independent CHAT module with normalized conversations, messages and target-specific transport adapters.

No UI or portal economy is implemented at this stage.

See docs/master-plan.md, docs/save-system.md and docs/controller-core.md.
