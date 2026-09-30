# FREEzzz Platform

A new modular platform built from zero.

## Project law

Development follows the corrected 31-stage master plan strictly in order. Every completed action is checked against the plan before the next stage begins.

**Current stage: 11 — Emulator Architecture**

## Core principles

- Unlimited independent cores.
- Self-contained modules.
- No direct module-to-module coupling.
- Web, Android, Telegram and future targets are isolated through adapters.
- Performance and emulation capability have priority over decorative graphics.
- UI is minimal and uses no decorative drawings or emoji.
- No portal-wide economy.

## Current foundation scope

Stages 1–9 provide the platform foundation. Stage 10 provides the dependency-injected SDK facade with an explicit CoreResolver boundary. Stage 11 defines the universal emulator boundary and independent CPU, Memory, Video, Audio, Input, Timing and Storage abstractions plus adapter discovery.

No console-specific emulator or UI is implemented at this stage.

See docs/master-plan.md and docs/emulator-architecture.md.
