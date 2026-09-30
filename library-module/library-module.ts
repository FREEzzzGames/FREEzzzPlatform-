import { BaseModule, type ModuleContext } from "../module-contract/module-contract";

export type LibraryModuleStatus = "created" | "ready" | "running" | "stopped" | "failed";

export type LibraryItemType = "game" | "application" | "media" | "document" | "other";

export interface LibraryItem {
  readonly id: string;
  readonly title: string;
  readonly type: LibraryItemType;
  readonly version: string;
  readonly source: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface LibraryQuery {
  readonly type?: LibraryItemType;
  readonly text?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface LibraryStorage {
  readonly id: string;
  readonly version: string;
  list(): readonly LibraryItem[];
  add(item: LibraryItem): void;
  remove(itemId: string): boolean;
  get(itemId: string): LibraryItem | undefined;
  clear(): void;
}

export interface LibraryStorageAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: "web" | "android-native" | "telegram" | "custom";
  createStorage(): LibraryStorage;
}

export class LibraryStorageRegistry {
  private readonly adapters = new Map<string, LibraryStorageAdapter>();

  register(adapter: LibraryStorageAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Library storage adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Library storage adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): LibraryStorageAdapter | undefined { return this.adapters.get(id); }
  list(): readonly LibraryStorageAdapter[] { return [...this.adapters.values()]; }
}

export class LibraryCatalog {
  private readonly items = new Map<string, LibraryItem>();

  add(item: LibraryItem): void {
    if (!item.id.trim() || !item.title.trim() || !item.version.trim() || !item.source.trim()) {
      throw new Error("Library item id, title, version and source must not be empty.");
    }
    if (this.items.has(item.id)) throw new Error(`Library item "${item.id}" already exists.`);
    this.items.set(item.id, {
      ...item,
      metadata: item.metadata ? { ...item.metadata } : undefined
    });
  }

  remove(itemId: string): boolean { return this.items.delete(itemId); }

  get(itemId: string): LibraryItem | undefined {
    const item = this.items.get(itemId);
    return item ? { ...item, metadata: item.metadata ? { ...item.metadata } : undefined } : undefined;
  }

  list(query?: LibraryQuery): readonly LibraryItem[] {
    const text = query?.text?.trim().toLowerCase();
    return [...this.items.values()]
      .filter(item => query?.type === undefined || item.type === query.type)
      .filter(item => !text || item.title.toLowerCase().includes(text) || item.id.toLowerCase().includes(text))
      .filter(item => {
        if (!query?.metadata) return true;
        return Object.entries(query.metadata).every(([key, value]) => item.metadata?.[key] === value);
      })
      .map(item => ({ ...item, metadata: item.metadata ? { ...item.metadata } : undefined }));
  }

  clear(): void { this.items.clear(); }
}

export interface LibraryModuleApi {
  readonly status: LibraryModuleStatus;
  readonly storage: LibraryStorageRegistry;
  readonly catalog: LibraryCatalog;
  initialize(context: ModuleContext): void;
  start(): void;
  stop(): void;
  dispose(): void;
  add(item: LibraryItem): void;
  remove(itemId: string): boolean;
  get(itemId: string): LibraryItem | undefined;
  query(query?: LibraryQuery): readonly LibraryItem[];
  clear(): void;
}

export class LibraryModule extends BaseModule implements LibraryModuleApi {
  private statusValue: LibraryModuleStatus = "created";
  readonly storage = new LibraryStorageRegistry();
  readonly catalog = new LibraryCatalog();

  constructor() {
    super({ id: "library", name: "LIBRARY", version: "1.0.0" });
  }

  get status(): LibraryModuleStatus { return this.statusValue; }

  override initialize(context: ModuleContext): void {
    super.initialize(context);
    if (this.statusValue === "created" || this.statusValue === "stopped") this.statusValue = "ready";
  }

  start(): void {
    if (this.statusValue === "running") return;
    if (this.statusValue === "created") throw new Error("LIBRARY module must be initialized before starting.");
    if (this.statusValue !== "ready" && this.statusValue !== "stopped") {
      throw new Error(`LIBRARY module cannot start while status is "${this.statusValue}".`);
    }
    this.statusValue = "running";
  }

  stop(): void {
    if (this.statusValue === "created" || this.statusValue === "stopped") return;
    this.statusValue = "stopped";
  }

  override dispose(): void {
    super.dispose();
    this.catalog.clear();
    this.statusValue = "stopped";
  }

  add(item: LibraryItem): void {
    this.requireRunning();
    this.catalog.add(item);
  }

  remove(itemId: string): boolean {
    this.requireRunning();
    return this.catalog.remove(itemId);
  }

  get(itemId: string): LibraryItem | undefined {
    this.requireRunning();
    return this.catalog.get(itemId);
  }

  query(query?: LibraryQuery): readonly LibraryItem[] {
    this.requireRunning();
    return this.catalog.list(query);
  }

  clear(): void {
    this.requireRunning();
    this.catalog.clear();
  }

  private requireRunning(): void {
    if (this.statusValue !== "running") throw new Error("LIBRARY module must be running.");
  }
}
