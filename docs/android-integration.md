# Android Integration

Stage 23 defines the Android target boundary for FREEzzz Platform.

## Responsibilities
- represent Android application identity without Android SDK types;
- select a target host through an adapter;
- isolate Android lifecycle events;
- normalize intents;
- expose normalized window information;
- provide the boundary used by Android-native implementations.

## Boundary
AndroidHost is the platform-facing contract. Android Activity, Application, Context, Intent, Window and other Android SDK objects remain inside an AndroidHostAdapter implementation.

The platform does not require an Android SDK dependency.

## Lifecycle
The integration follows: created -> ready -> running -> stopped.

Starting initializes the host and dispatches normalized create, start and resume events. Stopping dispatches pause and stop before stopping the host. Disposal additionally dispatches destroy.

## Target isolation
Android Integration does not import CHAT, LIVE, RADIO, LIBRARY, Telegram Integration or emulator implementations. Android-native implementations can bind existing platform contracts through adapters without direct module coupling.

## Economy exclusion
No portal-wide economy, marketplace, shared currency, auctions, paid items, buying/selling or Collection Economy is introduced.
