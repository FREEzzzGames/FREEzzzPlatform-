import { describe, expect, it } from "vitest";
import { ContentCatalog, ContentLoader, MemoryContentRepository } from "../../content-rom/content-rom";

describe("ContentRomLayer", () => {
  it("stores opaque content and returns defensive copies", () => {
    const repository = new MemoryContentRepository();
    const payload = new Uint8Array([1, 2, 3]);
    repository.add({ id: "game.test", version: "1", type: "rom", name: "Test ROM", size: 3, checksum: "abc" }, payload);
    const loaded = new ContentLoader(repository).load("game.test");
    loaded[0] = 9;
    expect(new ContentLoader(repository).load("game.test")[0]).toBe(1);
    expect(new ContentCatalog(repository).get("game.test")?.type).toBe("rom");
  });

  it("filters content by type and validates size", () => {
    const repository = new MemoryContentRepository();
    repository.add({ id: "bios.test", version: "1", type: "bios", name: "BIOS", size: 1, checksum: "x" }, new Uint8Array([7]));
    repository.add({ id: "asset.test", version: "1", type: "asset", name: "Asset", size: 1, checksum: "y" }, new Uint8Array([8]));
    expect(repository.list("bios")).toHaveLength(1);
    expect(() => repository.add({ id: "bad", version: "1", type: "rom", name: "Bad", size: 2, checksum: "x" }, new Uint8Array([1]))).toThrow();
  });

  it("rejects duplicate content and missing loads", () => {
    const repository = new MemoryContentRepository();
    const descriptor = { id: "x", version: "1", type: "rom" as const, name: "X", size: 0, checksum: "x" };
    repository.add(descriptor, new Uint8Array());
    expect(() => repository.add(descriptor, new Uint8Array())).toThrow();
    expect(() => new ContentLoader(repository).load("missing")).toThrow();
  });
});
