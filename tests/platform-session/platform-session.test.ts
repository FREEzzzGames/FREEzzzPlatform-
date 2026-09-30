import { describe, expect, it } from "vitest";
import { PlatformSessionPersistence } from "../../platform-session/platform-session";
import { MemoryTargetStorageAdapter } from "../../storage/platform-storage";

describe("PlatformSessionPersistence", () => {
  it("round-trips workspace and selected game state", () => {
    const adapter = new MemoryTargetStorageAdapter("test");
    const persistence = new PlatformSessionPersistence(adapter);
    const saved = persistence.save({
      workspace: { view: "library", revision: 4 },
      selectedGameId: "game-1"
    });
    expect(saved.selectedGameId).toBe("game-1");
    expect(persistence.load()).toMatchObject({
      workspace: { view: "library", revision: 4 },
      selectedGameId: "game-1"
    });
  });

  it("ignores malformed state", () => {
    const adapter = new MemoryTargetStorageAdapter("test");
    const persistence = new PlatformSessionPersistence(adapter);
    adapter.set("platform-session", "{bad");
    expect(persistence.load()).toBeUndefined();
  });
});
