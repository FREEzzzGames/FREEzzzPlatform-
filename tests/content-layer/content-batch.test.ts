import { describe, expect, it } from "vitest";
import { GameContentBatchLoader } from "../../content-layer/content-batch";
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource, sha256 } from "../../content-layer/content-layer";

describe("content batch", () => {
  it("loads compatible content and isolates failures", () => {
    const source = new MemoryGameContentSource();
    const bytes = new Uint8Array([1, 2, 3]);
    source.register({ id:"rom-1", gameId:"game-1", kind:"rom", version:"1.0.0", size:3, checksum:sha256(bytes) }, bytes);
    const registry = new GameContentRegistry();
    registry.register({ gameId:"game-1", version:"1.0.0", emulatorId:"nes", entryContentId:"rom-1", requiredContent:[] });
    const loader = new GameContentBatchLoader(new GameContentResolver(registry, source));
    const result = loader.load([{gameId:"game-1",emulatorId:"nes"},{gameId:"missing",emulatorId:"nes"}]);
    expect(result.loaded).toEqual(["game-1"]);
    expect(result.failed).toHaveLength(1);
  });
});
