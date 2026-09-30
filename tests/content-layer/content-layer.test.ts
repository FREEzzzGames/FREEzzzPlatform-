import { describe, expect, it } from "vitest";
import { GameContentRegistry, GameContentResolver, GameContentPackageLoader, MemoryGameContentSource, sha256 } from "../../content-layer/content-layer";

describe("Game Content Layer", () => {
  it("calculates SHA-256 and resolves a complete game package", () => {
    const rom = new Uint8Array([0xea, 0xea, 0x00]);
    expect(sha256(rom)).toBe("7f6e3e8530102aa52f826d7ae490d93c1d0b74daec706d299c767b74ba866cdc");
    const source = new MemoryGameContentSource();
    source.register({ id: "demo-rom", gameId: "demo", kind: "rom", version: "1.0.0", size: 3, checksum: sha256(rom) }, rom);
    const registry = new GameContentRegistry();
    registry.register({ gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "demo-rom", requiredContent: [] });
    const resolver = new GameContentResolver(registry, source);
    const resolved = resolver.resolve("demo", "nes");
    expect(Array.from(resolved.entry)).toEqual([0xea, 0xea, 0]);
    expect(new GameContentPackageLoader(resolver).load("demo", "nes").manifest.emulatorId).toBe("nes");
  });

  it("rejects missing, corrupted and incompatible content", () => {
    const source = new MemoryGameContentSource();
    const bytes = new Uint8Array([7]);
    source.register({ id: "asset", gameId: "demo", kind: "asset", version: "1.0.0", size: 1, checksum: "bad-checksum" }, bytes);
    const registry = new GameContentRegistry();
    registry.register({ gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "asset", requiredContent: [] });
    const resolver = new GameContentResolver(registry, source);
    expect(() => resolver.resolve("demo", "nes")).toThrow("checksum mismatch");
    expect(() => resolver.resolve("demo", "snes")).toThrow("incompatible");
  });

  it("isolates source bytes", () => {
    const source = new MemoryGameContentSource();
    const bytes = new Uint8Array([7]);
    source.register({ id: "asset", gameId: "demo", kind: "asset", version: "1.0.0", size: 1, checksum: sha256(bytes) }, bytes);
    const loaded = source.load("asset");
    loaded[0] = 9;
    expect(source.load("asset")[0]).toBe(7);
  });
});
