# Native Performance Core

Stage 12 introduces the platform-independent high-performance boundary beneath the Emulator Architecture.

## Responsibilities

The layer defines:
- a backend contract for high-performance CPU execution;
- GPU command submission;
- audio submission;
- backend capability discovery;
- independent Android-native and WebAssembly adapter targets.

The layer is UI-independent and does not implement a specific console CPU, GPU, emulator, renderer or game.

## Architecture

Emulator cores can later request a performance backend through the registry without knowing whether execution is provided by Android native code or WebAssembly.

The target adapters are contracts only at this stage. Native binaries/WASM modules and console-specific implementations belong to later stages.

## Constraints

No UI, portal economy, module-to-module coupling or console-specific emulator logic is introduced here.
