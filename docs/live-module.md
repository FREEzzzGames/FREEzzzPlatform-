# Stage 18 — LIVE Module

Stage 18 defines the independent LIVE module boundary.

## Responsibilities

- channels and live-stream catalog data;
- normalized stream sources and protocols;
- playback state;
- target-specific player adapters;
- lifecycle and playback control.

Supported protocol identifiers are:

- `hls`
- `dash`
- `webrtc`
- `progressive`
- `custom`

Supported target adapters are:

- `web`
- `android-native`
- `telegram`
- `custom`

## Boundaries

LIVE does not directly depend on Web media APIs, Android media APIs, Telegram APIs, CHAT, RADIO, LIBRARY, UI or portal economy.

The module does not implement a network stack or a specific media player. Concrete playback belongs to a registered `LivePlayerAdapter`.

A stream source is represented as opaque source data. The LIVE module does not assume that a source is reachable or that playback will succeed.

## Lifecycle

`created → ready → running → stopped`

Playback is separately controlled through `load → play / pause / stop`.

## Stage 21 exclusion

LIVE contains no portal-wide economy, shared currency, marketplace, auctions, paid streams or purchasing logic.
