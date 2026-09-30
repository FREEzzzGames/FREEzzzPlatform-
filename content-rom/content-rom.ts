export type ContentType = "rom" | "bios" | "asset" | "metadata" | "patch";

export interface ContentDescriptor {
  readonly id: string;
  readonly version: string;
  readonly type: ContentType;
  readonly name: string;
  readonly size: number;
  readonly checksum: string;
  readonly mediaType?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface ContentSource {
  readonly id: string;
  readonly version: string;
  readonly target: "local" | "web" | "android-native" | "telegram" | "custom";
  read(descriptor: ContentDescriptor): Uint8Array;
}

export interface ContentRepository {
  add(descriptor: ContentDescriptor, payload: Uint8Array): void;
  remove(id: string): boolean;
  get(id: string): ContentDescriptor | undefined;
  read(id: string): Uint8Array | undefined;
  list(type?: ContentType): readonly ContentDescriptor[];
  clear(): void;
}

export class MemoryContentRepository implements ContentRepository {
  private readonly descriptors = new Map<string, ContentDescriptor>();
  private readonly payloads = new Map<string, Uint8Array>();

  add(descriptor: ContentDescriptor, payload: Uint8Array): void {
    if (!descriptor.id.trim() || !descriptor.version.trim() || !descriptor.name.trim()) throw new Error("Content descriptor is incomplete.");
    if (descriptor.size < 0 || descriptor.size !== payload.byteLength) throw new Error("Content size does not match payload.");
    if (!descriptor.checksum.trim()) throw new Error("Content checksum must not be empty.");
    if (this.descriptors.has(descriptor.id)) throw new Error(`Content already exists: ${descriptor.id}`);
    this.descriptors.set(descriptor.id, Object.freeze({ ...descriptor, metadata: descriptor.metadata ? Object.freeze({ ...descriptor.metadata }) : undefined }));
    this.payloads.set(descriptor.id, new Uint8Array(payload));
  }

  remove(id: string): boolean { this.payloads.delete(id); return this.descriptors.delete(id); }
  get(id: string): ContentDescriptor | undefined { return this.descriptors.get(id); }
  read(id: string): Uint8Array | undefined {
    const payload = this.payloads.get(id);
    return payload ? new Uint8Array(payload) : undefined;
  }
  list(type?: ContentType): readonly ContentDescriptor[] {
    return Object.freeze([...this.descriptors.values()].filter(item => type === undefined || item.type === type));
  }
  clear(): void { this.descriptors.clear(); this.payloads.clear(); }
}

export class ContentCatalog {
  constructor(private readonly repository: ContentRepository) {}
  list(type?: ContentType): readonly ContentDescriptor[] { return this.repository.list(type); }
  get(id: string): ContentDescriptor | undefined { return this.repository.get(id); }
}

export class ContentLoader {
  constructor(private readonly repository: ContentRepository) {}
  load(id: string): Uint8Array {
    const payload = this.repository.read(id);
    if (!payload) throw new Error(`Content not found: ${id}`);
    return payload;
  }
}
