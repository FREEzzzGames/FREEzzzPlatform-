import type { Storage, StorageAdapter, StorageValue } from "./storage";

export type StorageTarget = "web" | "android-native" | "telegram" | "custom";
export interface TargetStorageAdapter extends StorageAdapter { readonly target: StorageTarget; }

class MemoryTargetStorage implements Storage {
  private readonly values = new Map<string, StorageValue>();
  get(key: string) { return this.values.get(key); }
  set(key: string, value: StorageValue) {
    if (!key.trim()) throw new Error("Storage key must not be empty.");
    this.values.set(key, value instanceof Uint8Array ? value.slice() : value);
  }
  has(key: string) { return this.values.has(key); }
  delete(key: string) { return this.values.delete(key); }
  keys() { return [...this.values.keys()]; }
  clear() { this.values.clear(); }
}

export class MemoryTargetStorageAdapter implements TargetStorageAdapter {
  readonly id = "memory-target";
  readonly version = "1.0.0";
  private readonly storage = new MemoryTargetStorage();
  constructor(readonly target: StorageTarget) {}
  create(): Storage { return this.storage; }
  get(key: string) { return this.storage.get(key); }
  set(key: string, value: StorageValue) { this.storage.set(key, value); }
  remove(key: string) { return this.storage.delete(key); }
}

export class BrowserLocalStorage implements Storage {
  constructor(private readonly prefix = "freezzz:") {}
  get(key: string) {
    const raw = globalThis.localStorage?.getItem(this.prefix + key);
    if (raw === null || raw === undefined) return undefined;
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) && value.every(n => Number.isInteger(n)) ? Uint8Array.from(value) : value;
    } catch { return raw; }
  }
  set(key: string, value: StorageValue) {
    globalThis.localStorage?.setItem(this.prefix + key, JSON.stringify(value instanceof Uint8Array ? Array.from(value) : value));
  }
  has(key: string) { return globalThis.localStorage?.getItem(this.prefix + key) !== null; }
  delete(key: string) {
    if (!this.has(key)) return false;
    globalThis.localStorage?.removeItem(this.prefix + key);
    return true;
  }
  keys() {
    const out: string[] = [];
    for (let i = 0; i < (globalThis.localStorage?.length ?? 0); i++) {
      const key = globalThis.localStorage?.key(i);
      if (key?.startsWith(this.prefix)) out.push(key.slice(this.prefix.length));
    }
    return out;
  }
  clear() { for (const key of this.keys()) globalThis.localStorage?.removeItem(this.prefix + key); }
}

export class WebStorageAdapter implements TargetStorageAdapter {
  readonly id = "web-local-storage";
  readonly version = "1.0.0";
  readonly target = "web" as const;
  constructor(private readonly prefix = "freezzz:") {}
  create(): Storage { return new BrowserLocalStorage(this.prefix); }
}
