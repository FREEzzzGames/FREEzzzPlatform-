# Telegram Integration

Stage 22 defines the Telegram target boundary for FREEzzz Platform.

## Responsibilities
- represent Telegram bot identity without Telegram SDK types;
- select a target-specific client through an adapter;
- normalize inbound updates and outbound messages;
- route updates to registered handlers;
- isolate Telegram transport details from platform modules.

## Boundary
TelegramClient is the platform-facing contract. A concrete Bot API SDK, webhook, polling implementation or network stack belongs behind TelegramClientAdapter.

Update payloads remain opaque Uint8Array values. This stage does not parse Telegram-specific objects.

## Update routing
Supported update types are message, callback, command and custom. Custom handlers receive all dispatched updates. Each subscription can be removed with the returned function.

## Isolation
This integration does not import or directly call CHAT, LIVE, RADIO or LIBRARY. Those modules remain independent.

## Lifecycle
created -> ready -> running -> stopped

A bot is initialized first, a client adapter is selected, and then the client is started.

## Security
Bot credentials and Telegram API details are outside this contract. Target implementations must keep secrets outside source code and client-exposed configuration.

## Economy exclusion
No marketplace, shared currency, paid items, auctions, buying/selling or Collection Economy is introduced.
