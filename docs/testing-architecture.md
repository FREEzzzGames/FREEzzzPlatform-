# Testing Architecture

Stage 27 defines a platform-independent testing architecture around explicit test layers and registered suites.

## Layers

- unit — isolated implementation behavior;
- contract — public API contracts;
- integration — boundaries between platform components;
- architecture — dependency and isolation rules;
- conformance — target or implementation compliance.

`TestArchitecture` can run one registered suite or all registered suites and produce a deterministic summary of passed/failed results.

## Boundary

This layer does not replace Vitest, GitHub Actions or target-specific test runners. It provides metadata and orchestration contracts that remain independent of Web, Android, Telegram, emulator UI and portal economy.

Tests must validate stage boundaries as well as behavior. No test may introduce a dependency that production architecture forbids.
