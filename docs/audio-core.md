# Stage 16 — Audio Core

Stage 16 defines the platform-independent audio boundary.

## Responsibilities

- define normalized audio format and buffer data;
- isolate target-specific audio devices behind adapters;
- queue audio buffers without exposing platform APIs;
- provide lifecycle and reset boundaries;
- preserve sample data from caller mutation.

## Boundaries

The Audio Core does not depend on Web Audio, Android audio APIs, Telegram APIs, UI, games or emulator implementations.

Adapters isolate:

- `web`
- `android-native`
- `telegram`
- `custom`

Audio buffers are opaque PCM sample data represented by Float32Array and an explicit format. The core does not decode files, synthesize music or choose a UI.

## Lifecycle

`created → ready → running → stopped`

Stage 13 NES audio remains an emulator-specific reference sink. Stage 16 does not couple the general Audio Core to NES.
