import { describe, expect, it } from "vitest";
import { Runtime } from "../../runtime/runtime";

describe("Runtime stage 1", () => {
  it("starts from created and becomes running", () => {
    const runtime = new Runtime({ environment: "test" });

    expect(runtime.getStatus()).toBe("created");
    runtime.start();

    expect(runtime.getStatus()).toBe("running");
    expect(runtime.getDiagnostics().startedAt).not.toBeNull();
  });

  it("start is idempotent while running", () => {
    const runtime = new Runtime();
    runtime.start();
    const firstStart = runtime.getDiagnostics().startedAt;

    runtime.start();

    expect(runtime.getStatus()).toBe("running");
    expect(runtime.getDiagnostics().startedAt).toBe(firstStart);
  });

  it("stops cleanly", () => {
    const runtime = new Runtime();
    runtime.start();
    runtime.stop();

    const diagnostics = runtime.getDiagnostics();

    expect(diagnostics.status).toBe("stopped");
    expect(diagnostics.stoppedAt).not.toBeNull();
    expect(diagnostics.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it("can stop safely before start", () => {
    const runtime = new Runtime();

    expect(() => runtime.stop()).not.toThrow();
    expect(runtime.getStatus()).toBe("created");
  });

  it("does not contain later-stage systems", () => {
    const runtime = new Runtime();

    expect("modules" in runtime).toBe(false);
    expect("events" in runtime).toBe(false);
    expect("storage" in runtime).toBe(false);
    expect("emulator" in runtime).toBe(false);
  });
});
