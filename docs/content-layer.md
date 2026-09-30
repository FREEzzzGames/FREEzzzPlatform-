# Content Layer — Phase F

The Content Layer defines normalized game content descriptors, manifests, sources and resolution.

A game manifest declares its emulator id, entry content and required content. A source owns the bytes; the resolver validates that every declared content item exists before returning an isolated copy of the entry bytes.

The layer does not download content, contact external stores, execute ROMs, or introduce paid content. Those concerns belong to target-specific adapters or later content delivery work.

Portal-wide economy and marketplace functionality remain permanently excluded.
