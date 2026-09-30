# Platform Adapters — Phase K

Phase K defines the target boundary between the platform core and concrete deployment environments.

A normalized PlatformAdapter resolves a target and creates the existing PlatformHost without importing a target SDK into the core. Web, Android and Telegram each have an independent adapter.

The adapters intentionally remain thin. Target SDK lifecycle, UI, storage, transport and device APIs belong inside their respective integration layers:
- Web adapter: browser/web host boundary.
- Android adapter: Android integration boundary.
- Telegram adapter: Telegram integration boundary.

The platform core remains target-independent and can reject unsupported targets instead of silently falling back.

No direct module-to-module dependency and no portal-wide economy are introduced.
