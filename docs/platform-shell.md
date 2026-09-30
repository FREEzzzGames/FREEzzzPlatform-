# Platform Shell

The Platform Shell is the first runnable host for FREEzzz Platform. It composes the completed foundation contracts without replacing them.

## Responsibilities

- bootstrap the Runtime;
- expose Core Registry, Module Manager, Capability Registry, Event Bus, Configuration and Storage;
- report readiness and health diagnostics;
- surface startup/runtime errors without crashing the UI;
- provide a deterministic start/stop/restart lifecycle;
- remain a host and diagnostics surface rather than becoming a game or economy layer.

## Web entry

The Vite application root is `web/`. The entry point is `web/main.ts`.

Development:

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The repository environment used for development may not have executed these commands locally. CI is the authoritative execution path when GitHub Actions is available.

## Health model

`created → starting → ready → stopping → stopped`

Any startup/stop failure moves the shell to `failed` and preserves the error for diagnostics.

## Scope boundary

The shell does not own game logic, emulator logic, CHAT/LIVE/RADIO/LIBRARY business logic, Telegram SDK behavior, Android SDK behavior or any portal-wide economy.

## Bootstrap

`PlatformBootstrap` is the explicit host boundary for starting the Platform Shell. It is idempotent, records start/completion timing, and preserves startup failures for diagnostics. The web entry point uses this boundary instead of starting the shell directly.
