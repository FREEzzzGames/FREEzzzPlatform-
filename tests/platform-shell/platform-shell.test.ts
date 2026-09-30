import { describe, expect, it } from "vitest";
import { PlatformShell } from "../platform-shell/platform-shell";

describe("PlatformShell", () => {
  it("starts and exposes independent platform registries", () => {
    const shell = new PlatformShell();
    expect(shell.getStatus().runtime.status).toBe("created");
    shell.start();
    const status = shell.getStatus();
    expect(status.runtime.status).toBe("running");
    expect(status.cores).toBe(0);
    expect(status.modules).toBe(0);
    expect(status.capabilities).toBe(0);
  });

  it("stops without coupling the registries", () => {
    const shell = new PlatformShell();
    shell.start(); shell.stop();
    expect(shell.getStatus().runtime.status).toBe("stopped");
  });
});
