# FREEzzz Platform — Director Execution Plan

## Mission

Turn the completed 31-stage architectural foundation into a real, testable, multi-target platform without bypassing its contracts.

## Phase A — Make the shell production-grade

1. Verify Vite entry/build configuration.
2. Add runtime error boundaries and visible diagnostics.
3. Add a deterministic bootstrap sequence for Runtime, Core Registry, Module Manager, capabilities, events, configuration and storage.
4. Add health/readiness diagnostics.
5. Add a smoke-test path for the web shell.

**Exit condition:** the platform starts, reports readiness, builds successfully and fails visibly instead of silently.

## Phase B — Platform composition

6. Create a formal Platform Host contract.
7. Connect existing target adapters without leaking target SDKs into cores/modules.
8. Register CHAT, LIVE, RADIO and LIBRARY as independently discoverable modules.
9. Connect Save, Controller and Audio cores through capabilities/adapters.
10. Add module enable/disable diagnostics to the shell.

**Exit condition:** every existing subsystem can be loaded independently through the architecture.

## Phase C — Real application shell

11. Replace the diagnostics-only screen with the actual FREEzzz Platform workspace.
12. Keep UI minimal, functional and responsive.
13. Add navigation between independent clusters without direct module coupling.
14. Add persistent user configuration and platform state.
15. Add error/recovery screens.

**Exit condition:** the web version behaves as a platform, not merely a developer dashboard.

## Phase D — Game execution layer

16. Formalize Game Core contract.
17. Connect Emulator Architecture + Native Performance Core + Controller + Audio + Save.
18. Move the NES reference into a runnable emulator host.
19. Establish a generic game adapter so future emulators do not depend on the shell.
20. Add first playable local game flow.

**Exit condition:** a game can launch, receive input, render frames, produce audio and save/restore state through independent contracts.

## Phase E — LIVE / RADIO / CHAT / LIBRARY

21. Add real target adapters behind LIVE.
22. Add real radio playback adapters behind RADIO.
23. Add Chat transport adapters behind CHAT.
24. Turn LIBRARY into the platform content navigator.
25. Integrate these modules only through capabilities/events, never direct module imports.

**Exit condition:** each module works independently and can be replaced without rewriting the platform shell.

## Phase F — Android + Telegram product targets

26. Build Android host around the existing Android Integration contract.
27. Build Telegram host around the existing Telegram Integration contract.
28. Keep Web/Android/Telegram behavior behind adapters.
29. Add target-specific release artifacts and signing infrastructure externally.

**Exit condition:** the same platform contracts operate across Web, Android and Telegram.

## Phase G — Quality and release

30. Establish physical CI execution with a committed lockfile.
31. Add architecture/conformance gates to CI.
32. Add performance budgets from Performance Lab.
33. Add security gates and dependency auditing.
34. Add content validation and release verification.
35. Produce versioned Web/Android/Telegram release artifacts.

**Exit condition:** repeatable builds and releases with measurable quality gates.

## Permanent architectural laws

- Stage 21 remains excluded permanently.
- No portal-wide economy.
- No shared coins, marketplace, auctions, paid items or Collection Economy.
- No direct module-to-module coupling.
- Target SDKs stay behind adapters.
- Production code cannot bypass established contracts for convenience.
- Performance and correctness precede decorative UI.
- No release is called complete until its verification path is defined.

## Director rule

The next task is always the smallest concrete increment that advances the current phase while preserving all completed contracts. Do not redesign completed architecture without evidence from tests or a real integration failure.
