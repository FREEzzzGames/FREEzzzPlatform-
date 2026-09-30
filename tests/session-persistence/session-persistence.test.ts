import { describe, expect, it } from "vitest";
import { SessionPersistence } from "../../session-persistence/session-persistence";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";
import { GameCatalog } from "../../game-catalog/game-catalog";
import { GameSessionManager } from "../../session-manager/session-manager";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { NESMemory, NESFrameVideo, NESAudioSink, NESControllerAdapter, NESFixedTiming } from "../../emulators/nes/nes-emulator";

function setup() {
  const saves = new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
  const catalog = new GameCatalog();
  catalog.register({ id: "demo", name: "Demo", version: "1.0.0", emulatorId: "nes", content: { gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "rom", requiredContent: [] } });
  const manager = new GameSessionManager(new GameRuntime());
  const components = { cpu: { reset() {}, step() {} }, memory: new NESMemory(), video: new NESFrameVideo(), audio: new NESAudioSink(), input: new NESControllerAdapter(), timing: new NESFixedTiming(), storage: new MemoryStorage() };
  const services = { controller: new DefaultControllerCore(), audio: new DefaultAudioCore(), saves };
  const session = manager.create(catalog, "demo", components, services, "session-a");
  manager.start("session-a");
  return { session, persistence: new SessionPersistence(saves) };
}

describe("SessionPersistence", () => {
  it("persists and restores normalized session metadata and payload", () => {
    const { session, persistence } = setup();
    persistence.save(session, new Uint8Array([1, 2, 3]), 100);
    const restored = persistence.load(session.id);
    expect(restored?.sessionId).toBe("session-a");
    expect(restored?.gameId).toBe("demo");
    expect(Array.from(restored!.payload)).toEqual([1, 2, 3]);
  });

  it("isolates stored payload bytes", () => {
    const { session, persistence } = setup();
    persistence.save(session, new Uint8Array([9]), 100);
    const restored = persistence.load(session.id)!;
    restored.payload[0] = 1;
    expect(persistence.load(session.id)!.payload[0]).toBe(9);
  });
});
