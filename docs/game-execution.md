# Game Execution — Phase D

Game Execution is the runtime pipeline that composes an emulator with normalized controller, audio, save and optional performance services.

## Lifecycle

`created -> starting -> running <-> paused -> stopping -> stopped`

A startup or frame failure enters `failed` and performs best-effort reverse-order cleanup.

## Frame pipeline

Each frame polls controller input and then advances the emulator. Audio and performance services are lifecycle-managed but remain independent adapters.

## Persistence

Save/load is delegated to the Save System. The execution layer does not define game-specific save formats.

## Isolation

The execution session imports only platform contracts. It does not depend on web, Android, Telegram SDKs, or portal-wide economy services.
