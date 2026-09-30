import { describe, expect, it } from "vitest";
import { BaseCore } from "../../core-api/core-api";

class TestCore extends BaseCore {\n  constructor(coreMetadata: typeof coreMetadata) { super(coreMetadata); }
  started = false;
  stopped = false;

  protected onStart(): void { this.started = true; }
  protected onStop(): void { this.stopped = true; }
}

const coreMetadata = { id: "demo", name: "Demo Core", version: "1.0.0" };

describe("Core API stage 3", () => {
  it("provides a stable core lifecycle", () => {
    const core = new TestCore(coreMetadata);
    core.start({ core: coreMetadata });
    expect(core.getStatus()).toBe("running");
    expect(core.started).toBe(true);
    core.stop();
    expect(core.getStatus()).toBe("stopped");
    expect(core.stopped).toBe(true);
  });

  it("makes start idempotent while running", () => {
    const core = new TestCore(coreMetadata);
    core.start({ core: coreMetadata });
    const first = core.getDiagnostics().startedAt;
    core.start({ core: coreMetadata });
    expect(core.getDiagnostics().startedAt).toBe(first);
  });

  it("captures startup failures", () => {
    class FailingCore extends BaseCore {
      protected onStart(): void { throw new Error("boom"); }
    }
    const core = new FailingCore(coreMetadata);
    expect(() => core.start({ core: coreMetadata })).toThrow("boom");
    expect(core.getStatus()).toBe("failed");
    expect(core.getDiagnostics().error?.message).toBe("boom");
  });

  it("does not introduce later systems", () => {
    const core = new TestCore(coreMetadata);
    expect("events" in core).toBe(false);
    expect("storage" in core).toBe(false);
    expect("modules" in core).toBe(false);
  });
});
