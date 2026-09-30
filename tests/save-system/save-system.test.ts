import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../../storage/storage";
import { DefaultSaveSystem, StorageSaveProvider, BinaryJsonCodec } from "../../save-system/save-system";

describe("Stage 14 — Save System", () => {
  it("keeps battery saves and save states in one API while preserving their type", () => {
    const system = new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
    const battery = system.save("SAVE 01", "battery", "1.0.0", new Uint8Array([1, 2]), 100);
    const state = system.save("SAVE STATE 01", "state", "1.0.0", new Uint8Array([3, 4]), 200);
    expect(battery.kind).toBe("battery");
    expect(state.kind).toBe("state");
    expect(system.list("battery")).toHaveLength(1);
    expect(system.list("state")).toHaveLength(1);
  });
  it("preserves creation time and replaces payload on repeated saves", () => {
    const system = new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
    system.save("SAVE 01", "state", "1.0.0", new Uint8Array([1]), 100);
    system.save("SAVE 01", "state", "1.0.0", new Uint8Array([2]), 200);
    const loaded = system.load("SAVE 01");
    expect(loaded?.createdAt).toBe(100);
    expect(loaded?.updatedAt).toBe(200);
    expect(loaded?.payload).toEqual(new Uint8Array([2]));
  });
  it("serializes typed data without coupling the save system to a game", () => {
    const codec = new BinaryJsonCodec<{ level: number; name: string }>("1.0.0");
    expect(codec.decode(codec.encode({ level: 7, name: "test" }))).toEqual({ level: 7, name: "test" });
  });
  it("does not expose mutable stored payload buffers", () => {
    const system = new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
    const original = new Uint8Array([5, 6]);
    const saved = system.save("SAVE 01", "state", "1.0.0", original, 100);
    original[0] = 99; saved.payload[1] = 99;
    expect(system.load("SAVE 01")?.payload).toEqual(new Uint8Array([5, 6]));
  });
  it("rejects changing save kind inside the same slot", () => {
    const system = new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
    system.save("SAVE 01", "battery", "1.0.0", new Uint8Array([1]), 100);
    expect(() => system.save("SAVE 01", "state", "1.0.0", new Uint8Array([2]), 200)).toThrow();
  });
});