import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../../storage/storage";

describe("Storage stage 8", () => {
  it("stores and retrieves primitive values", () => {
    const storage = new MemoryStorage();
    storage.set("score", 42);
    storage.set("name", "player");
    storage.set("enabled", true);

    expect(storage.get("score")).toBe(42);
    expect(storage.get("name")).toBe("player");
    expect(storage.get("enabled")).toBe(true);
  });

  it("supports existence, deletion and keys", () => {
    const storage = new MemoryStorage();
    storage.set("a", 1);
    storage.set("b", 2);

    expect(storage.has("a")).toBe(true);
    expect(storage.keys()).toEqual(["a", "b"]);
    expect(storage.delete("a")).toBe(true);
    expect(storage.has("a")).toBe(false);
  });

  it("clears all values and rejects empty keys", () => {
    const storage = new MemoryStorage();
    storage.set("a", null);
    storage.clear();

    expect(storage.keys()).toEqual([]);
    expect(() => storage.set("   ", 1)).toThrow("must not be empty");
  });
});
