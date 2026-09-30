# Platform Host — Phase B

The Platform Host is the runtime composition boundary above the completed Platform Shell.

## Responsibilities

- own the host manifest and target identity;
- compose the existing Platform Shell;
- register independent Core instances;
- start the shell before starting registered cores;
- stop registered cores before stopping the shell;
- resolve Core instances by id without introducing Core-to-Core coupling;
- expose host diagnostics;
- remain independent from Web, Android and Telegram SDKs.

## Lifecycle

`created → starting → ready → stopping → stopped`

A startup failure moves the host to `failed`, records the original error and attempts best-effort cleanup of already-started cores and the shell.

## Registration boundary

Cores are registered before host start, or after a complete stop. Registration while the host is running is rejected so the running graph remains deterministic.

## Target isolation

The host stores only the normalized target value:

- `web`
- `android`
- `telegram`
- `custom`

Target SDKs and UI objects belong in adapters outside the host.

## Scope boundary

This phase does not add a portal economy, marketplace, shared currency, UI business logic, game logic, or direct module-to-module coupling.
