# Stage 19 — RADIO Module

Stage 19 defines the independent RADIO module.

## Responsibilities

- radio station catalog data;
- normalized stream source and format metadata;
- playback state;
- target-specific player adapters;
- lifecycle and playback control.

## Boundaries

RADIO does not directly depend on Web audio APIs, Android APIs, Telegram APIs, CHAT, LIVE, LIBRARY, UI or portal economy.

A station stream is represented as opaque source data. The module does not implement a network stack or a concrete media engine. Real playback belongs to a registered `RadioPlayerAdapter`.

Supported target adapters are:

- `web`
- `android-native`
- `telegram`
- `custom`

The format identifier is intentionally extensible; concrete adapters decide which formats they support.

## Lifecycle

`created → ready → running → stopped`

Playback is controlled through `load → play / pause / stop`.

## Stage 21 exclusion

RADIO contains no portal-wide economy, shared currency, marketplace, auctions, paid streams or purchasing logic.
