# SDK v0.10

The SDK is the stable developer-facing facade over the platform foundation.

It exposes Core Registry, Module Manager, Capability Registry, Event Bus, Configuration and Storage through dependency injection.

Runtime Core lookup is supplied through an explicit CoreResolver. Registry metadata is never cast or treated as a runtime Core.

The SDK does not create application modules, UI, networking, emulator behavior, target-specific adapters, or a portal economy. Those concerns remain in later stages.
