# Session Persistence — Phase I

Session Persistence now connects durable session records to the emulator state boundary.

A StatefulEmulator exposes snapshotState() and restoreState() through a target-independent contract. GameExecutionSession owns the execution-level boundary and only permits snapshots while the game is running or paused.

SessionPersistence.saveSession() captures the real emulator state and stores it through the existing Save System. restoreSession() validates the session, game and emulator identity before applying the stored state.

The NES reference emulator implements this contract with CPU registers, CPU cycle counter, full 64 KiB memory, frame counter and deterministic timing. The persistence envelope is versioned independently from the emulator state.

The persistence layer remains emulator-agnostic: it does not parse or modify emulator-specific state.