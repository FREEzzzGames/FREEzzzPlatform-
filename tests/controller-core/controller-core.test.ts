import { describe, expect, it } from "vitest";
import {
  ControllerStateStore,
  DefaultControllerCore,
  type ControllerAdapter,
  type ControllerDevice
} from "../../controller-core/controller-core";

class TestDevice implements ControllerDevice {
  readonly id = "test-device";
  readonly version = "1.0.0";
  readonly maxControllers = 1;
  private active = true;

  initialize(): void {
    this.active = true;
  }

  poll() {
    return this.active
      ? [{
          controllerId: "player-1",
          button: "a" as const,
          action: "press" as const,
          timestamp: 100
        }]
      : [];
  }

  reset(): void {
    this.active = false;
  }

  getStatus() {
    return "ready" as const;
  }
}

class TestAdapter implements ControllerAdapter {
  readonly id = "test";
  readonly version = "1.0.0";
  readonly target = "custom" as const;

  supports(deviceId: string): boolean {
    return deviceId === "test-device";
  }

  createDevice(): ControllerDevice {
    return new TestDevice();
  }
}

describe("Stage 15 — Controller Core", () => {
  it("tracks independent controller state", () => {
    const state = new ControllerStateStore();

    state.apply({
      controllerId: "p1",
      button: "a",
      action: "press",
      timestamp: 1
    });
    state.apply({
      controllerId: "p1",
      button: "b",
      action: "press",
      timestamp: 2
    });
    state.apply({
      controllerId: "p1",
      button: "a",
      action: "release",
      timestamp: 3
    });

    expect([...state.get("p1").buttons]).toEqual(["b"]);
    expect(state.get("p2").buttons.size).toBe(0);
  });

  it("resolves adapters by target without coupling to a platform", () => {
    const core = new DefaultControllerCore();
    const adapter = new TestAdapter();

    core.registry.register(adapter);

    expect(core.registry.resolve("test-device", "custom")).toBe(adapter);
    expect(() => core.registry.resolve("test-device", "web")).toThrow();
  });

  it("polls adapters and updates controller state", () => {
    const core = new DefaultControllerCore();
    core.registry.register(new TestAdapter());

    core.initialize();
    core.start();

    const inputs = core.poll();

    expect(inputs).toHaveLength(1);
    expect([...core.state.get("player-1").buttons]).toEqual(["a"]);
  });

  it("resets state without removing registered adapters", () => {
    const core = new DefaultControllerCore();
    core.registry.register(new TestAdapter());
    core.start();

    core.poll();
    core.reset();

    expect(core.state.get("player-1").buttons.size).toBe(0);
    expect(core.registry.get("test")).toBeDefined();
  });
});
