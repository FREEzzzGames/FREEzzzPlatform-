import { describe, expect, it } from "vitest";
import { GameExecutionSession } from "../../game-execution/game-execution";
import type { Emulator, EmulatorComponents, StatefulEmulator } from "../../emulator/emulator";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";

class FakeEmulator implements StatefulEmulator {
  readonly metadata = { id: "fake", name: "Fake", version: "1.0.0" };
  status: "created" | "running" | "stopped" = "created";
  frames = 0;
  state = new Uint8Array([7, 8]);
  start(): void { this.status = "running"; }
  stop(): void { this.status = "stopped"; }
  reset(): void {}
  runFrame(): void { if (this.status !== "running") throw new Error("not running"); this.frames += 1; }
  getStatus() { return this.status; }
  getDiagnostics() { return { status: this.status, startedAt: null, stoppedAt: null, error: null }; }
  snapshotState(): Uint8Array { return this.state.slice(); }
  restoreState(snapshot: Uint8Array): void { this.state = snapshot.slice(); }
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

  it("snapshots and restores the emulator state", () => {
    const s = session();
    s.start();
    expect(Array.from(s.snapshotState())).toEqual([7, 8]);
    s.restoreState(new Uint8Array([4, 5]));
    expect(Array.from(s.snapshotState())).toEqual([4, 5]);
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

  it("rejects snapshots for emulators without state support", () => {
    const emulator: Emulator = {
      metadata: { id: "plain", name: "Plain", version: "1.0.0" },
      start() {}, stop() {}, reset() {}, runFrame() {},
      getStatus: () => "running",
      getDiagnostics: () => ({ status: "running", startedAt: null, stoppedAt: null, error: null })
    };
    const s = new GameExecutionSession(
      { id: "plain", name: "Plain", version: "1.0.0", emulatorId: "plain", target: "web" },
      {
        emulator, emulatorComponents: components,
        controller: new DefaultControllerCore(), audio: new DefaultAudioCore(),
        saves: new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()))
      }
    );
    s.start();
    expect(() => s.snapshotState()).toThrow(/does not support state snapshots/);
  });
});