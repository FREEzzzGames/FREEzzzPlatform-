# Patch System

Stage 25 defines a platform-independent patch contract.

## Model

A patch contains a manifest, version transition, normalized path operations and a checksum field. The system validates the manifest before applying operations through a `PatchStorage` boundary.

Supported operations are `add`, `replace` and `remove`.

## Boundaries

The Patch System does not download patches, authenticate servers, execute arbitrary code, modify ROMs, or depend on Web, Android, Telegram, UI, games or the portal economy. Network and target-specific delivery belong to future adapters.

`PatchHistory` tracks applied patch identifiers independently of storage and transport.
