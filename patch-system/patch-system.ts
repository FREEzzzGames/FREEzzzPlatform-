import type { Storage } from "../storage/storage";

export type PatchOperation = "add" | "replace" | "remove";

export interface PatchEntry {
  readonly path: string;
  readonly operation: PatchOperation;
  readonly value?: string;
}

export interface PatchManifest {
  readonly id: string;
  readonly version: string;
  readonly targetVersion: string;
  readonly entries: readonly PatchEntry[];
}

export interface PatchPackage {
  readonly manifest: PatchManifest;
  readonly checksum: string;
}

export interface PatchResult {
  readonly patchId: string;
  readonly applied: number;
}

export interface PatchStorage {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): boolean;
}

export class StoragePatchStorage implements PatchStorage {
  constructor(private readonly storage: Storage) {}
  get(key: string): string | undefined {
    const value = this.storage.get(key);
    return typeof value === "string" ? value : undefined;
  }
  set(key: string, value: string): void { this.storage.set(key, value); }
  delete(key: string): boolean { return this.storage.delete(key); }
}

export interface PatchSystem {
  validate(patch: PatchPackage): void;
  apply(patch: PatchPackage, storage: PatchStorage): PatchResult;
}

export class DefaultPatchSystem implements PatchSystem {
  validate(patch: PatchPackage): void {
    if (!patch.manifest.id.trim() || !patch.manifest.version.trim() || !patch.manifest.targetVersion.trim()) {
      throw new Error("Patch manifest must contain id, version and targetVersion.");
    }
    if (!patch.checksum.trim()) throw new Error("Patch checksum must not be empty.");
    for (const entry of patch.manifest.entries) {
      if (!entry.path.trim() || !entry.path.startsWith("/")) throw new Error("Patch paths must be absolute.");
      if ((entry.operation === "add" || entry.operation === "replace") && entry.value === undefined) {
        throw new Error("Patch value is required for add and replace operations.");
      }
    }
  }

  apply(patch: PatchPackage, storage: PatchStorage): PatchResult {
    this.validate(patch);
    let applied = 0;
    for (const entry of patch.manifest.entries) {
      if (entry.operation === "remove") storage.delete(entry.path);
      else storage.set(entry.path, entry.value as string);
      applied += 1;
    }
    return { patchId: patch.manifest.id, applied };
  }
}

export class PatchHistory {
  private readonly applied = new Set<string>();
  has(patchId: string): boolean { return this.applied.has(patchId); }
  record(patchId: string): void { this.applied.add(patchId); }
  clear(): void { this.applied.clear(); }
}
