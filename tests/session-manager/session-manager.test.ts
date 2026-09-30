import { describe, expect, it } from "vitest";
import { GameCatalog } from "../../game-catalog/game-catalog";
import { GameSessionManager } from "../../session-manager/session-manager";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";
import { NESMemory, NESFrameVideo, NESAudioSink, NESControllerAdapter, NESFixedTiming } from "../../emulators/nes/nes-emulator";

function setup() {
  const catalog = new GameCatalog();
  catalog.register({ id: "demo", name: "Demo", version: "1.0.0", emulatorId: "nes", content: { gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "rom", requiredContent: [] } });
  const components = { cpu: { reset() {}, step() {} }, memory: new NESMemory(), video: new NESFrameVideo(), audio: new NESAudioSink(), input: new NESControllerAdapter(), timing: new NESFixedTiming(), storage: new MemoryStorage() };
  const services = { controller: new DefaultControllerCore(), audio: new DefaultAudioCore(), saves: new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage())) };
  return { catalog, manager: new GameSessionManager(new GameRuntime()), components, services };
}

describe("GameSessionManager", () => {
  it("creates and controls an independent game session", () => {
    const { catalog, manager, components, services } = setup();
    const session = manager.create(catalog, "demo", components, services, "s1");
    expect(session.getStatus()).toBe("created");
    manager.start("s1");
    manager.pause("s1");
    expect(session.getStatus()).toBe("paused");
    manager.resume("s1");
    manager.stop("s1");
    expect(session.getStatus()).toBe("stopped");
  });

  it("isolates multiple sessions and supports destruction", () => {
    const setupValue = setup();
    const a = setupValue.manager.create(setupValue.catalog, "demo", setupValue.components, setupValue.services, "a");
    const b = setupValue.manager.create(setupValue.catalog, "demo", setupValue.components, setupValue.services, "b");
    expect(setupValue.manager.list()).toHaveLength(2);
    setupValue.manager.destroy("a");
    expect(setupValue.manager.get("a")).toBeUndefined();
    expect(setupValue.manager.get("b")).toBe(b);
  });
});
