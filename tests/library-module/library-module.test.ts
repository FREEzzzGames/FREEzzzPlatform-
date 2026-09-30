import { describe, expect, it } from "vitest";
import {
  LibraryCatalog,
  LibraryModule,
  type LibraryItem,
  type LibraryStorage,
  type LibraryStorageAdapter
} from "../../library-module/library-module";

class TestStorage implements LibraryStorage {
  readonly id = "test-storage";
  readonly version = "1.0.0";
  private readonly items = new Map<string, LibraryItem>();
  list(): readonly LibraryItem[] { return [...this.items.values()]; }
  add(item: LibraryItem): void { this.items.set(item.id, item); }
  remove(itemId: string): boolean { return this.items.delete(itemId); }
  get(itemId: string): LibraryItem | undefined { return this.items.get(itemId); }
  clear(): void { this.items.clear(); }
}

class TestStorageAdapter implements LibraryStorageAdapter {
  readonly id = "test-library-storage";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  readonly storage = new TestStorage();
  createStorage(): LibraryStorage { return this.storage; }
}

const game: LibraryItem = {
  id: "game-1",
  title: "Reference Game",
  type: "game",
  version: "1.0.0",
  source: "local://game-1",
  metadata: { platform: "nes" }
};

describe("Stage 20 — LIBRARY Module", () => {
  it("adds, queries and removes catalog items", () => {
    const catalog = new LibraryCatalog();
    catalog.add(game);
    expect(catalog.list({ type: "game", text: "reference" })).toEqual([game]);
    expect(catalog.remove("game-1")).toBe(true);
    expect(catalog.list()).toEqual([]);
  });

  it("filters by metadata without exposing mutable references", () => {
    const catalog = new LibraryCatalog();
    catalog.add(game);
    const result = catalog.list({ metadata: { platform: "nes" } });
    expect(result).toEqual([game]);
    expect(result[0].metadata).not.toBe(game.metadata);
  });

  it("provides target-specific storage adapters", () => {
    const module = new LibraryModule();
    const adapter = new TestStorageAdapter();
    module.storage.register(adapter);
    expect(module.storage.get("test-library-storage")).toBe(adapter);
    expect(adapter.target).toBe("custom");
  });

  it("keeps LIBRARY independent and excludes economy behavior", () => {
    const module = new LibraryModule();
    expect(module.metadata.id).toBe("library");
    expect(module.status).toBe("created");
  });
});
