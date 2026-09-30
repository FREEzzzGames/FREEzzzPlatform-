import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../../storage/storage";
import { DefaultPatchSystem, PatchHistory, StoragePatchStorage } from "../../patch-system/patch-system";

describe("PatchSystem", () => {
  it("validates and applies add/replace/remove operations", () => {
    const storage = new StoragePatchStorage(new MemoryStorage());
    storage.set("/old", "value");
    const system = new DefaultPatchSystem();
    const result = system.apply({
      manifest: { id: "p1", version: "1.0.0", targetVersion: "1.0.1", entries: [
        { path: "/new", operation: "add", value: "A" },
        { path: "/new", operation: "replace", value: "B" },
        { path: "/old", operation: "remove" }
      ]}, checksum: "checksum"
    }, storage);
    expect(result).toEqual({ patchId: "p1", applied: 3 });
    expect(storage.get("/new")).toBe("B");
    expect(storage.get("/old")).toBeUndefined();
  });

  it("rejects invalid manifests", () => {
    expect(() => new DefaultPatchSystem().validate({ manifest: { id: "", version: "1", targetVersion: "2", entries: [] }, checksum: "x" })).toThrow();
    expect(() => new DefaultPatchSystem().validate({ manifest: { id: "p", version: "1", targetVersion: "2", entries: [{ path: "relative", operation: "add" }] }, checksum: "x" })).toThrow();
  });

  it("tracks applied patch ids independently", () => {
    const history = new PatchHistory();
    expect(history.has("p1")).toBe(false);
    history.record("p1");
    expect(history.has("p1")).toBe(true);
    history.clear();
    expect(history.has("p1")).toBe(false);
  });
});
