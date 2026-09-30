import { describe, expect, it } from "vitest";
import { PlatformShell } from "../../platform-shell/platform-shell";

describe("PlatformShell", () => {
  it("starts into ready state and exposes diagnostics", () => {
    const shell = new PlatformShell();
    expect(shell.getStatus()).toBe("created");
    shell.start();
    const diagnostics = shell.getDiagnostics();
    expect(diagnostics.status).toBe("ready");
    expect(diagnostics.runtime.status).toBe("running");
    expect(diagnostics.cores).toBe(0);
    expect(diagnostics.modules).toBe(0);
    expect(diagnostics.capabilities).toBe(0);
    expect(diagnostics.configurationKeys).toBe(0);
    expect(diagnostics.storageKeys).toBe(0);
  });

  it("is idempotent for start and stop", () => {
    const shell = new PlatformShell();
    shell.start();
    shell.start();
    expect(shell.getStatus()).toBe("ready");
    shell.stop();
    shell.stop();
    expect(shell.getStatus()).toBe("stopped");
    expect(shell.getDiagnostics().runtime.status).toBe("stopped");
  });

  it("allows a clean restart", () => {
    const shell = new PlatformShell();
    shell.start();
    shell.stop();
    shell.start();
    expect(shell.getStatus()).toBe("ready");
    expect(shell.getDiagnostics().runtime.status).toBe("running");
  });
});
