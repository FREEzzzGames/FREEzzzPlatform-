# Platform Workspace — Phase C

The Platform Workspace is the user-facing application state boundary above Platform Host. It owns navigation and recoverable UI state; it does not implement CHAT, LIVE, RADIO or LIBRARY business logic.

## State

Views are normalized identifiers: `home`, `library`, `chat`, `live`, `radio`, `system`.

The workspace can navigate, snapshot and restore its state, and expose a degraded state with a recoverable error.

## Integration rule

The workspace communicates with the platform through Platform Host and normalized platform state. It does not import module business implementations and does not create module-to-module links.

## Scope

Phase C adds the application workspace, persistent navigation state and recovery semantics. It does not add portal-wide economy, shared currency, marketplace, paid items or Collection Economy.
