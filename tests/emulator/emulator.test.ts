import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../../storage/storage";
import {
  BaseEmulatorCore,
  EmulatorAdapterRegistry,
  type EmulatorComponents
} from "../../emulator/emulator";

function components(): EmulatorComponents {
  return {
    cpu: { reset: () => undefined, step: () => undefined },
    memory: {
      size: 1024,
      read: (_address, length) => new Uint8Array(length),
      write: () => undefined
    },
    video: { width: 160, height: 144, present: () => undefined },
    audio: { sampleRate: 44100, push: () => undefined },
    input: { poll: () => [] },
    timing: { now: () => 1, wait: () => undefined },
    storage: new MemoryStorage()
  };
}

class TestEmulator extends BaseEmulatorCore {
  constructor() {
    super({ id: "test-emulator", name: "Test Emulator", version: "1.0.0" }, components());
  }
}

describe("Emulator Architecture stage 11", () => {
  it("provides a platform-independent emulator lifecycle without console logic", () => {
    const emulator = new TestEmulator();

    expect(emulator.getStatus()).toBe("created");
    emulator.start({ emulator: emulator.metadata });
    expect(emulator.getStatus()).toBe("running");

    emulator.runFrame();
    emulator.reset();
    emulator.stop();

    expect(emulator.getStatus()).toBe("stopped");
  });

  it("keeps adapters independent and discoverable", () => {
    const registry = new EmulatorAdapterRegistry();
    const emulator = new TestEmulator();
    const adapter = {
      id: "test-adapter",
      version: "1.0.0",
      supports: (id: string) => id === "test-emulator",
      create: () => emulator
    };

    registry.register(adapter);
    expect(registry.resolve("test-emulator")).toBe(adapter);
    expect(registry.list()).toHaveLength(1);
    expect(registry.unregister("test-adapter")).toBe(true);
  });
});
