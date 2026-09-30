import { describe, expect, it } from "vitest";
import { GameCatalog } from "../../game-catalog/game-catalog";
import { GameSessionManager } from "../../session-manager/session-manager";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { WebPlayer } from "../../web-player/web-player";
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
  return { catalog, player: new WebPlayer(catalog, { sessions: new GameSessionManager(new GameRuntime()), components, ...services }) };
}

describe("WebPlayer", () => {
  it("selects, launches, pauses, resumes and exits a game", () => {
    const { player } = setup();
    expect(player.getState().view).toBe("library");
    player.select("demo");
    expect(player.getState().status).toBe("ready");
    player.launch();
    expect(player.getState().view).toBe("game");
    expect(player.getState().status).toBe("playing");
    player.pause();
    expect(player.getState().status).toBe("paused");
    player.resume();
    expect(player.getState().status).toBe("playing");
    player.exit();
    expect(player.getState().view).toBe("library");
    expect(player.getState().sessionId).toBeNull();
  });

  it("runs frames and persists/restores emulator state", () => {
    const { player } = setup();
    player.select("demo");
    player.launch();
    player.frame();
    expect(player.getSession()?.execution.getDiagnostics().frames).toBe(1);
    player.saveState();
    player.pause();
    player.restoreState();
    expect(player.getState().status).toBe("paused");
  });

  it("does not launch without a selected game", () => {
    const { player } = setup();
    expect(() => player.launch()).toThrow(/Select a game/);
    expect(player.getState().status).toBe("idle");
  });
});
