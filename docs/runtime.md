# Runtime v0.1

## Responsibility

The Runtime is the smallest executable foundation of FREEzzz Platform.

It owns:
1. startup;
2. shutdown;
3. lifecycle state;
4. version and environment metadata;
5. minimal diagnostics;
6. fatal runtime error state.

## Explicit non-responsibilities

Runtime does not implement Core Registry, Core API, Module Contract, Capability API, Event Bus, Configuration, Storage, Module Manager, SDK, Test Modules, Platform Adapter, UI, Game, Emulator, Controller, Audio, Save System, Library, Chat, Live, Radio, Android, Telegram, CI/CD, Patch System, Security, Performance Lab or Release.

Those are later stages and must not be pulled forward.

## Lifecycle

created -> starting -> running -> stopping -> stopped

A startup failure produces:

starting -> failed

The implementation is intentionally dependency-free at this stage.
