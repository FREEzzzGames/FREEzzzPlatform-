import { describe, expect, it } from "vitest";
import { PlatformSessionPersistence } from "../../platform-session/platform-session";
import { MemoryTargetStorageAdapter } from "../../storage/platform-storage";

describe("PlatformSessionPersistence", () => {
  it("round-trips workspace and selected game state", () => {
    const adapter = new MemoryTargetStorageAdapter("custom");
    const persistence = new PlatformSessionPersistence(adapter);
    const saved = persistence.save({
      workspace: { view: "library", revision: 4 },
      selectedGameId: "game-1",
      target: "web",
      sessionId: "session-1",
      gameSnapshot: [1, 2, 3]
    });
    expect(saved.selectedGameId).toBe("game-1");
    expect(saved.target).toBe("web");
    expect(saved.sessionId).toBe("session-1");
    expect(saved.gameSnapshot).toEqual([1, 2, 3]);
    expect(persistence.load()).toMatchObject({
      workspace: { view: "library", revision: 4 },
      selectedGameId: "game-1"
    });
  });

  it("ignores malformed state", () => {
    const adapter = new MemoryTargetStorageAdapter("custom");
    const persistence = new PlatformSessionPersistence(adapter);
    adapter.create().set("platform-session", "{bad");
    expect(persistence.load()).toBeUndefined();
  });
});
