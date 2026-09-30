# Security

Stage 29 defines the platform security boundary without binding the platform to a particular operating system, browser or network provider.

## Policy

Security principals receive only explicitly registered permissions. The `SecurityGuard` denies unknown principals and permissions by default.

The stage also provides bounded text-input validation and a small secret-redaction helper for diagnostics/logging boundaries.

## Boundary

This layer is not a replacement for OS sandboxing, Android permissions, browser security, TLS, authentication providers or GitHub repository permissions. Those controls remain in their respective target adapters and infrastructure.

No credentials are embedded in the platform source. No portal-wide economy, marketplace or paid-item mechanism is introduced.
