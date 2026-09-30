import { describe, expect, it } from "vitest";
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource } from "../../content-layer/content-layer";

describe("Game Content Layer", () => {
  it("registers and resolves a complete game manifest", () => {
    const source = new MemoryGameContentSource();
    source.register({ id: "demo-rom", gameId: "demo", kind: "rom", version: "1.0.0", size: 3, checksum: "demo-checksum" }, new Uint8Array([0xea, 0xea, 0x00]));
    const registry = new GameContentRegistry();
    registry.register({ gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "demo-rom", requiredContent: [] });
    const resolved = new GameContentResolver(registry, source).resolve("demo");
    expect(Array.from(resolved.entry)).toEqual([0xea, 0xea, 0]);
    expect(resolved.content[0].checksum).toBe("demo-checksum");
  });

  it("isolates content bytes and rejects missing content", () => {
    const source = new MemoryGameContentSource();
    source.register({ id: "asset", gameId: "demo", kind: "asset", version: "1.0.0", size: 1, checksum: "x" }, new Uint8Array([7]));
    const registry = new GameContentRegistry();
    registry.register({ gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "asset", requiredContent: ["missing"] });
    expect(() => new GameContentResolver(registry, source).resolve("demo")).toThrow("missing");
    const bytes = source.load("asset"); bytes[0] = 9;
    expect(source.load("asset")[0]).toBe(7);
  });
});
