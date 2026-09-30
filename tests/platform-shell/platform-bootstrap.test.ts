import { describe, expect, it } from "vitest";
import { PlatformBootstrap } from "../../platform-shell/platform-bootstrap";
import { PlatformShell } from "../../platform-shell/platform-shell";

describe("PlatformBootstrap", () => {
  it("starts a shell once and reports readiness", () => {
    const shell = new PlatformShell();
    const bootstrap = new PlatformBootstrap(shell);

    bootstrap.start();
    bootstrap.start();

    const diagnostics = bootstrap.getDiagnostics();
    expect(diagnostics.status).toBe("ready");
    expect(diagnostics.startedAt).not.toBeNull();
    expect(diagnostics.completedAt).not.toBeNull();
    expect(diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(shell.getStatus()).toBe("ready");
  });

  it("keeps a failed bootstrap diagnosable", () => {
    const shell = new PlatformShell();
    const bootstrap = new PlatformBootstrap(shell);
    const originalStart = shell.start.bind(shell);
    shell.start = () => { throw new Error("bootstrap failure"); };

    expect(() => bootstrap.start()).toThrow("bootstrap failure");
    const diagnostics = bootstrap.getDiagnostics();
    expect(diagnostics.status).toBe("failed");
    expect(diagnostics.error?.message).toBe("bootstrap failure");

    shell.start = originalStart;
  });
});
