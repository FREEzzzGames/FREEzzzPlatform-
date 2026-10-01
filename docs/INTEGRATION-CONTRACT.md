# FREEzzz Platform — Integration Contract

This contract is part of the release architecture. A release is considered connected only when every required link below is present and verifiable.

## Canonical chain

GitHub main → CI → GitHub Pages → Web application → Telegram WebApp / CHAT bridge / LIVE providers / GAME runtime

## Required links

1. GitHub
   - canonical repository: FREEzzzGames/FREEzzzPlatform-
   - canonical branch: main
   - Pages workflow and CI workflow must exist
2. Build
   - typecheck
   - tests
   - Vite production build
3. GitHub Pages
   - dist/index.html exists
   - deployed entrypoint is the Vite application
   - Pages smoke test must receive HTTP 200
4. Web
   - web/index.html loads web/main.ts
   - Telegram WebApp SDK is loaded before the application module
   - application keeps working outside Telegram
5. Telegram
   - Telegram.WebApp is detected when available
   - ready() and expand() are called
   - absence of Telegram does not break Web
6. CHAT
   - Web uses the canonical CHAT bridge URL
   - history, config, SSE events and message send paths remain connected
7. LIVE
   - web/live-status.json is part of the deployed artifact
   - LIVE client reads that cache
   - LIVE status workflow owns cache refresh
   - offline playback may use fallbackVideoId
8. GAME
   - GameCatalog/GameRuntime/WebGamePlayer remain connected to the Web shell
9. Independence
   - failure of Telegram, CHAT or LIVE must not prevent the base Web application from rendering

## Release rule

Changes to one link must not silently remove another link. CI and Pages must run the integration contract verifier before a release is accepted.

## Current scope

This contract describes the existing Web/Telegram/CHAT/LIVE/GAME architecture. It does not introduce a backend, portal economy, or a replacement for any existing module.
