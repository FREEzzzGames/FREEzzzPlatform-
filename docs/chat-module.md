# Stage 17 — CHAT Module

Stage 17 defines the independent CHAT module.

## Responsibilities

- conversation and participant data;
- normalized text messages;
- local message storage;
- target-specific transport adapters;
- module lifecycle.

## Boundaries

CHAT does not depend directly on Web, Android, Telegram, LIVE, RADIO, LIBRARY, UI or portal economy.

Platform connectivity is represented only by `ChatTransportAdapter` and its targets:

- `web`
- `android-native`
- `telegram`
- `custom`

The module stores normalized messages and conversations. It does not implement a portal-wide economy, marketplace, auctions, paid items or shared currency.

## Lifecycle

`created → ready → running → stopped`

CHAT is a module, not a platform core. Its owner is supplied through the existing Module Contract context.
