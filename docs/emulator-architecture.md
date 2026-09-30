# Emulator Architecture

Stage 11 defines the universal emulator boundary. It does not implement a console.

## Contract

The architecture provides independent interfaces for:
- CPU
- Memory
- Video
- Audio
- Input
- Timing
- Storage

BaseEmulatorCore owns lifecycle orchestration and delegates actual emulation to components. EmulatorAdapterRegistry discovers independent emulator/platform adapters without coupling adapters to UI or portal modules.

## Deliberate exclusions

- no NES, GB, GBC, GBA, SNES, Genesis or PS1 implementation;
- no UI;
- no renderer implementation;
- no game logic;
- no portal economy;
- no direct module-to-module dependency.

Concrete emulator cores belong to later stages.
