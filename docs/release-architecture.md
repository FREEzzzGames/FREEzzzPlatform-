# Release Architecture

Stage 31 defines the final release boundary of FREEzzz Platform.

## Release lifecycle

A release has a version, channel, status and target-specific artifacts. The lifecycle is:

`draft -> candidate -> released -> deprecated`

`ReleaseManager` validates artifact metadata and checksums before a candidate is created. Only candidates can be released, and only released versions can be deprecated.

## Targets

Artifacts are explicitly associated with `web`, `android`, `telegram` or `custom`. The release layer does not embed target SDKs or platform credentials.

## Boundary

This stage defines release metadata and lifecycle only. Publishing infrastructure, signing services, stores, Telegram credentials and deployment providers remain external adapters/infrastructure. Release architecture does not introduce a portal-wide economy or marketplace.

The 31-stage architecture is now complete. Future implementation work must extend the defined boundaries rather than bypass them.
