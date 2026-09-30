# Content Layer — Phase J

The Content Layer now provides an integrity-checked game package pipeline.

A package consists of a versioned game manifest and descriptors for its entry and required content. The resolver validates:
- every declared content item exists;
- content belongs to the declared game;
- descriptor size matches the actual bytes;
- SHA-256 checksum matches the actual bytes;
- the package emulator id matches the requested emulator.

GameContentPackageLoader produces a validated package boundary. GameRuntime consumes the same resolver and refuses incompatible content or an emulator without the required content-loading boundary.

Content remains opaque to the platform. The runtime does not interpret ROM formats; emulator adapters own execution semantics.

No external download service, store, paid content or portal-wide economy is introduced.
