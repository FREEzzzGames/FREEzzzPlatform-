# Web Player — Phase L

The WebPlayer is the target-facing orchestration layer for the browser player.

Flow:
1. list catalog games;
2. select a game;
3. create and start an isolated GameSession;
4. pause/resume the session;
5. exit and return to Library.

It delegates emulation, input, audio and saves to existing normalized services. It does not import emulator internals or target SDKs and does not create a portal-wide economy.
