export type GameContentKind = "rom" | "asset" | "metadata";

export interface GameContentDescriptor {
  readonly id: string;
  readonly gameId: string;
  readonly kind: GameContentKind;
  readonly version: string;
  readonly size: number;
  readonly checksum: string;
}

export interface GameContentSource {
  readonly id: string;
  readonly version: string;
  has(contentId: string): boolean;
  load(contentId: string): Uint8Array;
  describe(contentId: string): GameContentDescriptor;
}

export class MemoryGameContentSource implements GameContentSource {
  readonly id = "memory";
  readonly version = "1.0.0";
  private readonly entries = new Map<string, { descriptor: GameContentDescriptor; data: Uint8Array }>();

  register(descriptor: GameContentDescriptor, data: Uint8Array): void {
    if (!descriptor.id.trim() || !descriptor.gameId.trim() || !descriptor.version.trim()) throw new Error("Content descriptor fields must not be empty.");
    if (!Number.isInteger(descriptor.size) || descriptor.size < 0 || descriptor.size !== data.length) throw new Error("Content size does not match payload.");
    if (!descriptor.checksum.trim()) throw new Error("Content checksum must not be empty.");
    if (this.entries.has(descriptor.id)) throw new Error(`Content already registered: ${descriptor.id}`);
    this.entries.set(descriptor.id, { descriptor: Object.freeze({ ...descriptor }), data: data.slice() });
  }

  has(contentId: string): boolean { return this.entries.has(contentId); }

  load(contentId: string): Uint8Array {
    const entry = this.entries.get(contentId);
    if (!entry) throw new Error(`Content not found: ${contentId}`);
    return entry.data.slice();
  }

  describe(contentId: string): GameContentDescriptor {
    const entry = this.entries.get(contentId);
    if (!entry) throw new Error(`Content not found: ${contentId}`);
    return entry.descriptor;
  }
}

export interface GameContentManifest {
  readonly gameId: string;
  readonly version: string;
  readonly emulatorId: string;
  readonly entryContentId: string;
  readonly requiredContent: readonly string[];
}

export class GameContentRegistry {
  private readonly manifests = new Map<string, GameContentManifest>();

  register(manifest: GameContentManifest): void {
    if (!manifest.gameId.trim() || !manifest.version.trim() || !manifest.emulatorId.trim() || !manifest.entryContentId.trim()) {
      throw new Error("Game content manifest is incomplete.");
    }
    if (this.manifests.has(manifest.gameId)) throw new Error(`Game content manifest already registered: ${manifest.gameId}`);
    this.manifests.set(manifest.gameId, Object.freeze({ ...manifest, requiredContent: [...manifest.requiredContent] }));
  }

  get(gameId: string): GameContentManifest | undefined { return this.manifests.get(gameId); }
  list(): readonly GameContentManifest[] { return [...this.manifests.values()]; }
}

export class GameContentResolver {
  constructor(
    private readonly registry: GameContentRegistry,
    private readonly source: GameContentSource
  ) {}

  resolve(gameId: string): { readonly manifest: GameContentManifest; readonly entry: Uint8Array; readonly content: readonly GameContentDescriptor[] } {
    const manifest = this.registry.get(gameId);
    if (!manifest) throw new Error(`Game content manifest not found: ${gameId}`);
    const ids = new Set([manifest.entryContentId, ...manifest.requiredContent]);
    const content = [...ids].map(id => {
      if (!this.source.has(id)) throw new Error(`Required game content is missing: ${id}`);
      return this.source.describe(id);
    });
    return Object.freeze({
      manifest,
      entry: this.source.load(manifest.entryContentId),
      content
    });
  }
}
