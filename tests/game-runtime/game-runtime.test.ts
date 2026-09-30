import { describe, expect, it } from "vitest";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource } from "../../content-layer/content-layer";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";
import { NESMemory, NESFrameVideo, NESAudioSink, NESControllerAdapter, NESFixedTiming } from "../../emulators/nes/nes-emulator";

function components() {
  const memory = new NESMemory();
  return { cpu: { reset() {}, step() {} }, memory, video: new NESFrameVideo(), audio: new NESAudioSink(), input: new NESControllerAdapter(), timing: new NESFixedTiming(), storage: new MemoryStorage() };
}

function services() {
  return { controller: new DefaultControllerCore(), audio: new DefaultAudioCore(), saves: new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage())) };
}

describe("GameRuntime", () => {
  it("resolves the NES adapter and creates a runnable execution session", () => {
    const runtime = new GameRuntime();
    const session = runtime.create({ id: "nes-game", name: "NES Game", version: "1.0.0", emulatorId: "nes", target: "web" }, components(), services());
    session.start(); session.stepFrame();
    expect(session.getDiagnostics().frames).toBe(1);
    session.stop();
  });

  it("loads entry content before creating the session", () => {
    const source = new MemoryGameContentSource();
    source.register({ id: "demo-rom", gameId: "demo", kind: "rom", version: "1.0.0", size: 4, checksum: "fe55256b40fa32a5bacc26950bb179b64ed483b5669eec7e8bb417c42cbe7074" }, new Uint8Array([0xa9, 0x42, 0x8d, 0x00]));
    const registry = new GameContentRegistry();
    registry.register({ gameId: "demo", version: "1.0.0", emulatorId: "nes", entryContentId: "demo-rom", requiredContent: [] });
    const runtime = new GameRuntime({ content: new GameContentResolver(registry, source) });
    const emulator = runtime.create({ id: "demo", name: "Demo", version: "1.0.0", emulatorId: "nes", target: "web" }, components(), services());
    emulator.start(); emulator.stepFrame();
    expect(emulator.getStatus()).toBe("running");
    emulator.stop();
  });

  it("rejects content when emulator or version is incompatible", () => {
    const source = new MemoryGameContentSource();
    const rom = new Uint8Array([0xa9, 0x42, 0x8d, 0x00]);
    source.register({ id: "demo-rom", gameId: "demo", kind: "rom", version: "1.0.0", size: 4, checksum: "fe55256b40fa32a5bacc26950bb179b64ed483b5669eec7e8bb417c42cbe7074" }, rom);
    const registry = new GameContentRegistry();
    registry.register({ gameId: "demo", version: "2.0.0", emulatorId: "nes", entryContentId: "demo-rom", requiredContent: [] });
    const runtime = new GameRuntime({ content: new GameContentResolver(registry, source) });
    expect(() => runtime.create({ id: "demo", name: "Demo", version: "1.0.0", emulatorId: "nes", target: "web" }, components(), services())).toThrow(/version/);
    expect(() => runtime.create({ id: "demo", name: "Demo", version: "2.0.0", emulatorId: "other", target: "web" }, components(), services())).toThrow(/incompatible|adapter/);
  });
});
