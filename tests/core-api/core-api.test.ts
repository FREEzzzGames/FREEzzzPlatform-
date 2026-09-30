import { describe, expect, it } from "vitest";
import { BaseCore } from "../../core-api/core-api";

class TestCore extends BaseCore {
  started = false;
  stopped = false;

  protected onStart(): void { this.started = true; }
  protected onStop(): void { this.stopped = true; }
}

const metadata = { id: "demo", name: "Demo Core", version: "1.0.0" };

describe("Core API stage 3", () => {
  it("provides a stable core lifecycle", () => {
    const core = new TestCore(metadata);
    core.start({ core: metadata });
    expect(core.getStatus()).toBe("running");
    expect(core.started).toBe(true);
    core.stop();
    expect(core.getStatus()).toBe("stopped");
    expect(core.stopped).toBe(true);
  });

  it("makes start idempotent while running", () => {
    const core = new TestCore(metadata);
    core.start({ core: metadata });
    const first = core.getDiagnostics().startedAt;
    core.start({ core: metadata });
    expect(core.getDiagnostics().startedAt).toBe(first);
  });

  it("captures startup failures", () => {
    class FailingCore extends BaseCore {
      protected onStart(): void { throw new Error("boom"); }
    }
    const core = new FailingCore(metadata);
    expect(() => core.start({ core: metadata })).toThrow("boom");
    expect(core.getStatus()).toBe("failed");
    expect(core.getDiagnostics().error?.message).toBe("boom");
  });

  it("does not introduce later systems", () => {
    const core = new TestCore(metadata);
    expect("events" in core).toBe(false);
    expect("storage" in core).toBe(false);
    expect("modules" in core).toBe(false);
  });
});
