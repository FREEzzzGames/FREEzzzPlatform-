export type StorageValue = string | number | boolean | null | Uint8Array;

export interface Storage {
  get(key: string): StorageValue | undefined;
  set(key: string, value: StorageValue): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  keys(): readonly string[];
  clear(): void;
}

export class MemoryStorage implements Storage {
  private readonly values = new Map<string, StorageValue>();

  get(key: string): StorageValue | undefined {
    return this.values.get(key);
  }

  set(key: string, value: StorageValue): void {
    if (!key.trim()) throw new Error("Storage key must not be empty.");
    this.values.set(key, value);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  delete(key: string): boolean {
    return this.values.delete(key);
  }

  keys(): readonly string[] {
    return [...this.values.keys()];
  }

  clear(): void {
    this.values.clear();
  }
}
