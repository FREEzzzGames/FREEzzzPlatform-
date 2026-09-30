# Game Runtime — Phase E

Game Runtime is the adapter-resolution boundary between a game manifest and the generic Game Execution session.

It registers the NES reference adapter by default, resolves an emulator by normalized emulator id, creates the emulator with supplied platform-neutral components, and returns a Game Execution session.

The runtime does not import Web, Android or Telegram SDKs and does not connect modules directly.

## First runnable path

`game manifest -> adapter registry -> NES adapter -> emulator -> Game Execution -> frame`

The NES implementation remains a reference emulator. It is not presented as full commercial ROM compatibility.

## Scope

Phase E adds concrete emulator resolution and a first runnable game path. Portal-wide economy and marketplace functionality remain excluded.
