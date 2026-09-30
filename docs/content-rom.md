# Content / ROM Layer

Stage 30 defines the content boundary for ROMs, BIOS data, assets, metadata and patch payloads.

## Design

Content is represented by a versioned descriptor and an opaque `Uint8Array` payload. The repository validates basic descriptor consistency and payload size, stores defensive copies, and exposes read-only catalog queries plus explicit loading.

Content sources are target-neutral contracts. Web, Android, Telegram or other acquisition mechanisms remain outside the repository implementation.

## Safety and licensing boundary

The layer does not download copyrighted ROMs, bypass protections, execute content, or determine whether a particular file is legally distributable. A checksum is metadata supplied by the content owner/provider; this stage does not pretend to implement cryptographic verification.

Stage 21 remains permanently excluded: content storage is not a marketplace, collection economy or paid-item system.
