# Game Catalog & Session Manager — Phase G

The Game Catalog stores normalized game entries. The selector tracks the current game choice without starting it.

The Session Manager creates and controls isolated Game Execution sessions from catalog entries. Sessions can start, pause, resume, stop and be destroyed independently.

The catalog does not implement a marketplace or shared economy. Session state is runtime state only.
