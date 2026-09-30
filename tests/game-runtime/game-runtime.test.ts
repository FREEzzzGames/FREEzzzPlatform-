import { describe, expect, it } from "vitest";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";
import { NESMemory, NESFrameVideo, NESAudioSink, NESControllerAdapter, NESFixedTiming } from "../../emulators/nes/nes-emulator";

function components() {
  const memory = new NESMemory();
  return {
    cpu: { reset() {}, step() {} },
    memory,
    video: new NESFrameVideo(),
    audio: new NESAudioSink(),
    input: new NESControllerAdapter(),
    timing: new NESFixedTiming(),
    storage: new MemoryStorage()
  };
}

describe("GameRuntime", () => {
  it("resolves the NES adapter and creates a runnable execution session", () => {
    const runtime = new GameRuntime();
    const services = {
      controller: new DefaultControllerCore(),
      audio: new DefaultAudioCore(),
      saves: new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()))
    };
    const session = runtime.create(
      { id: "nes-game", name: "NES Game", version: "1.0.0", emulatorId: "nes", target: "web" },
      components(),
      services
    );
    session.start();
    session.stepFrame();
    expect(session.getDiagnostics().frames).toBe(1);
    expect(session.getStatus()).toBe("running");
    session.stop();
  });

  it("does not hard-code target SDKs", () => {
    const runtime = new GameRuntime();
    expect(runtime.adapters.resolve("nes").id).toBe("nes-reference");
  });
});
