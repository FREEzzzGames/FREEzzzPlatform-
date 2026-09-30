import { describe, expect, it } from "vitest";
import { GameCatalog } from "../../game-catalog/game-catalog";
import { GameSessionManager } from "../../session-manager/session-manager";
import { WebPlayer } from "../../web-player/web-player";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource, sha256 } from "../../content-layer/content-layer";
import { SessionPersistence } from "../../session-persistence/session-persistence";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { NESMemory, NESFrameVideo, NESAudioSink, NESControllerAdapter, NESFixedTiming } from "../../emulators/nes/nes-emulator";

function setup(storage = new MemoryStorage()) {
  const catalog = new GameCatalog();
  catalog.register({ id: "demo", name: "Demo", version: "1.0.0", emulatorId: "nes", content: { gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "rom", requiredContent: [] } });
  const components = { cpu: { reset() {}, step() {} }, memory: new NESMemory(), video: new NESFrameVideo(), audio: new NESAudioSink(), input: new NESControllerAdapter(), timing: new NESFixedTiming(), storage: new MemoryStorage() };
  const services = { controller: new DefaultControllerCore(), audio: new DefaultAudioCore(), saves: new DefaultSaveSystem(new StorageSaveProvider(storage)) };
  const source = new MemoryGameContentSource();
  const rom = new Uint8Array([0xea, 0xea, 0x4c, 0x00, 0x80]);
  source.register({ id: "demo-rom", gameId: "demo", kind: "rom", version: "1.0.0", size: rom.length, checksum: sha256(rom) }, rom);
  const content = new GameContentRegistry();
  content.register({ gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "demo-rom", requiredContent: [] });
  const runtime = new GameRuntime({ content: new GameContentResolver(content, source) });
  return { catalog, player: new WebPlayer(catalog, { sessions: new GameSessionManager(runtime), components, ...services }) };
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

  it("continues a persisted game in a fresh player session", () => {
    const storage = new MemoryStorage();
    const first = setup(storage);
    first.player.select("demo");
    const firstSession = first.player.launch();
    first.player.frame();
    const savedSessionId = firstSession.id;
    first.player.saveState();
    first.player.exit();
    const second = setup(storage);
    second.player.select("demo");
    const continued = second.player.continueSaved(savedSessionId);
    expect(continued.id).toBe(savedSessionId);
    expect(second.player.getState().status).toBe("playing");
    expect(second.player.getSession()?.getStatus()).toBe("running");
    second.player.exit();
  });

  it("does not launch without a selected game", () => {
    const { player } = setup();
    expect(() => player.launch()).toThrow(/Select a game/);
    expect(player.getState().status).toBe("idle");
  });
});
