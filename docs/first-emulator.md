# Stage 13 — First Emulator

The first concrete emulator is the **NES reference core**.

## Why NES

Stage 13 requires one reference platform to prove the architecture before additional platforms are added. NES is selected as the first reference because it gives the platform a compact 8-bit CPU/memory/input/frame model suitable for validating the universal Emulator Architecture.

## Implemented boundary

- NES metadata and lifecycle;
- 16-bit memory space;
- reference 6502 CPU bootstrap instruction set;
- 256x240 video surface;
- 44.1 kHz audio sink;
- controller input;
- deterministic 60 Hz frame timing;
- suspendable lifecycle through stop/start;
- deterministic in-memory snapshot/restore;
- independent NES adapter.

## Accuracy boundary

This stage establishes the first executable reference core and its validation harness. It does **not** claim full NES commercial-ROM compatibility yet. Full CPU/PPU/APU accuracy and ROM/content integration are deliberately validated and expanded in later work.

The core remains independent of UI, Telegram, Android and portal modules.
