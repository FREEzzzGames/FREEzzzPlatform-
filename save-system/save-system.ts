import type { Storage } from "../storage/storage";

export type SaveKind = "battery" | "state";

export interface SaveSlot {
  readonly id: string;
  readonly kind: SaveKind;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly version: string;
  readonly payload: Uint8Array;
}

export interface SaveProvider {
  readonly id: string;
  readonly version: string;
  load(slotId: string): SaveSlot | undefined;
  save(slot: SaveSlot): void;
  delete(slotId: string): boolean;
  list(kind?: SaveKind): readonly SaveSlot[];
}

export interface SaveSystem {
  save(slotId: string, kind: SaveKind, version: string, payload: Uint8Array, now?: number): SaveSlot;
  load(slotId: string): SaveSlot | undefined;
  delete(slotId: string): boolean;
  list(kind?: SaveKind): readonly SaveSlot[];
  has(slotId: string): boolean;
}

export interface SaveCodec<T> {
  readonly version: string;
  encode(value: T): Uint8Array;
  decode(payload: Uint8Array): T;
}

export class BinaryJsonCodec<T> implements SaveCodec<T> {
  readonly version: string;
  constructor(version: string) {
    if (!version.trim()) throw new Error("Save codec version must not be empty.");
    this.version = version;
  }
  encode(value: T): Uint8Array { return new TextEncoder().encode(JSON.stringify(value)); }
  decode(payload: Uint8Array): T { return JSON.parse(new TextDecoder().decode(payload)) as T; }
}

export class StorageSaveProvider implements SaveProvider {
  readonly id = "storage";
  readonly version = "1.0.0";
  private readonly prefix = "save:";
  constructor(private readonly storage: Storage) {}
  load(slotId: string): SaveSlot | undefined {
    const value = this.storage.get(this.key(slotId));
    if (!(value instanceof Uint8Array)) return undefined;
    return this.clone(new BinaryJsonCodec<SaveSlot>("1.0.0").decode(value));
  }
  save(slot: SaveSlot): void {
    this.storage.set(this.key(slot.id), new BinaryJsonCodec<SaveSlot>("1.0.0").encode(slot));
  }
  delete(slotId: string): boolean { return this.storage.delete(this.key(slotId)); }
  list(kind?: SaveKind): readonly SaveSlot[] {
    return this.storage.keys().filter(key => key.startsWith(this.prefix))
      .map(key => this.load(key.slice(this.prefix.length)))
      .filter((slot): slot is SaveSlot => slot !== undefined && (kind === undefined || slot.kind === kind))
      .map(slot => this.clone(slot));
  }
  private key(slotId: string): string {
    if (!slotId.trim()) throw new Error("Save slot id must not be empty.");
    return this.prefix + slotId;
  }
  private clone(slot: SaveSlot): SaveSlot { return { ...slot, payload: slot.payload.slice() }; }
}

export class DefaultSaveSystem implements SaveSystem {
  constructor(private readonly provider: SaveProvider) {}
  save(slotId: string, kind: SaveKind, version: string, payload: Uint8Array, now = Date.now()): SaveSlot {
    if (!slotId.trim()) throw new Error("Save slot id must not be empty.");
    if (!version.trim()) throw new Error("Save version must not be empty.");
    const existing = this.provider.load(slotId);
    if (existing && existing.kind !== kind) throw new Error("Save slot \"" + slotId + "\" already contains a different save kind.");
    const slot: SaveSlot = { id: slotId, kind, createdAt: existing?.createdAt ?? now, updatedAt: now, version, payload: payload.slice() };
    this.provider.save(slot);
    return { ...slot, payload: slot.payload.slice() };
  }
  load(slotId: string): SaveSlot | undefined {
    const slot = this.provider.load(slotId);
    return slot ? { ...slot, payload: slot.payload.slice() } : undefined;
  }
  delete(slotId: string): boolean { return this.provider.delete(slotId); }
  list(kind?: SaveKind): readonly SaveSlot[] { return this.provider.list(kind); }
  has(slotId: string): boolean { return this.provider.load(slotId) !== undefined; }
}