# Game Runtime — Phase E

Game Runtime resolves emulator adapters and creates Game Execution sessions. When a Content Resolver is supplied, entry content is resolved and passed to emulators that expose the normalized optional `loadProgram` capability.

The runtime remains independent of Web, Android and Telegram SDKs. Content is validated before execution; the runtime does not download or monetize content.
