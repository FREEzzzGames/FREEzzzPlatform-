# Session Persistence — Phase H

Session Persistence stores normalized session metadata and opaque payload bytes through the existing Save System. It does not define emulator-specific state formats.

The persistence codec is versioned. Session records are isolated by session id and can be loaded or deleted independently.

This layer provides durable session metadata/recovery data; actual emulator snapshots remain owned by the emulator/save contracts.
