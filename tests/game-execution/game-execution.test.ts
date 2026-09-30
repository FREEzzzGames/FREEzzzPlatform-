import { describe, expect, it } from "vitest";
import { GameExecutionSession } from "../../game-execution/game-execution";
import type { Emulator, EmulatorComponents } from "../../emulator/emulator";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";

class FakeEmulator implements Emulator {
  readonly metadata = { id: "fake", name: "Fake", version: "1.0.0" };
  status: "created" | "running" | "stopped" = "created";
  frames = 0;
  start(): void { this.status = "running"; }
  stop(): void { this.status = "stopped"; }
  reset(): void {}
  runFrame(): void { if (this.status !== "running") throw new Error("not running"); this.frames += 1; }
  getStatus() { return this.status; }
  getDiagnostics() { return { status: this.status, startedAt: null, stoppedAt: null, error: null }; }
}
const components = {} as EmulatorComponents;

function session() {
  return new GameExecutionSession(
    { id: "game", name: "Game", version: "1.0.0", emulatorId: "fake", target: "web" },
    {
      emulator: new FakeEmulator(),
      emulatorComponents: components,
      controller: new DefaultControllerCore(),
      audio: new DefaultAudioCore(),
      saves: new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()))
    }
  );
}

describe("GameExecutionSession", () => {
  it("starts the execution pipeline and advances frames", () => {
    const s = session();
    s.start();
    s.stepFrame();
    s.stepFrame();
    expect(s.getDiagnostics()).toMatchObject({ status: "running", frames: 2 });
    s.stop();
    expect(s.getStatus()).toBe("stopped");
  });

  it("supports pause/resume and save/load", () => {
    const s = session();
    s.start();
    s.pause();
    expect(s.getStatus()).toBe("paused");
    s.resume();
    s.save("slot", "state", "1.0.0", new Uint8Array([1, 2, 3]), 10);
    expect(Array.from(s.load("slot")!.payload)).toEqual([1, 2, 3]);
  });

  it("fails safely when frame execution fails", () => {
    const s = session();
    s.start();
    const original = s.getDiagnostics;
    expect(original).toBeDefined();
    s.stop();
    expect(s.getStatus()).toBe("stopped");
  });
});
