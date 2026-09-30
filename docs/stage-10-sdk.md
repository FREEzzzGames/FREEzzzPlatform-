# Stage 10 — SDK

The SDK provides a single typed entry point for platform capabilities while keeping implementation dependencies injectable.

Dependencies:
- Core Registry
- Module Manager
- Capability API
- Event Bus
- Configuration
- Storage

Application code should depend on the SDK contract rather than importing concrete platform infrastructure where possible.
