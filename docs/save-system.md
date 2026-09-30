# Stage 14 — Save System

Stage 14 adds one save boundary with two explicit save kinds:

- Battery Save — persistent game-created data.
- Save State — emulator-state snapshot data.

Both use the same Save API but retain their type and slot identity.

## Architecture

- SaveSystem depends only on the SaveProvider contract.
- StorageSaveProvider adapts the existing platform Storage contract.
- Save payloads are opaque Uint8Array data; the save system does not know game-specific schemas.
- SaveCodec provides versioned serialization for typed application data.
- Save slots preserve creation/update timestamps and save version.
- Stored payloads are copied on input/output to prevent mutation leaks.

The layer is independent of UI, emulator-specific code, Telegram, Android and portal modules.

User-facing slots may use names such as SAVE 01, SAVE 02 and SAVE 03. The API does not hard-code a slot count.

No portal-wide economy or shared currency is introduced.
