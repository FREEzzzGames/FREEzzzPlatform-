import { describe, expect, it } from "vitest";
import { BaseCore } from "../../core-api/core-api";
import { ModuleManager } from "../../module-manager/module-manager";

class TestCore extends BaseCore {
  constructor(id: string) {
    super({ id, name: id, version: "1.0.0" });
  }
}

describe("Module Manager stage 9", () => {
  it("registers and resolves cores", () => {
    const manager = new ModuleManager();
    const core = new TestCore("core-a");

    manager.register(core);

    expect(manager.get("core-a")).toBe(core);
    expect(manager.list()).toHaveLength(1);
  });

  it("starts and stops managed cores", () => {
    const manager = new ModuleManager();
    const core = new TestCore("core-a");
    manager.register(core);

    manager.start("core-a");
    expect(core.getStatus()).toBe("running");

    manager.stop("core-a");
    expect(core.getStatus()).toBe("stopped");
  });

  it("supports ordered bulk lifecycle and rejects unknown cores", () => {
    const manager = new ModuleManager();
    manager.register(new TestCore("a"));
    manager.register(new TestCore("b"));

    manager.startAll();
    expect(manager.get("a")?.getStatus()).toBe("running");
    expect(manager.get("b")?.getStatus()).toBe("running");

    manager.stopAll();
    expect(manager.get("a")?.getStatus()).toBe("stopped");
    expect(manager.get("b")?.getStatus()).toBe("stopped");
    expect(() => manager.start("missing")).toThrow("not managed");
  });
});
