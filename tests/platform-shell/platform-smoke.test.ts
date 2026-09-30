import { describe, expect, it } from "vitest";
import { PlatformBootstrap } from "../../platform-shell/platform-bootstrap";
import { PlatformHealth } from "../../platform-shell/platform-health";
import { PlatformShell } from "../../platform-shell/platform-shell";

describe("Platform shell smoke contract", () => {
  it("boots the platform and reaches a healthy ready state", () => {
    const shell = new PlatformShell();
    const bootstrap = new PlatformBootstrap(shell);
    const health = new PlatformHealth(shell);

    expect(health.isReady()).toBe(false);
    bootstrap.start();

    const report = health.check();
    expect(bootstrap.getDiagnostics().status).toBe("ready");
    expect(report.status).toBe("healthy");
    expect(report.checks).toHaveLength(3);
  });

  it("returns to an unhealthy state after shutdown", () => {
    const shell = new PlatformShell();
    const bootstrap = new PlatformBootstrap(shell);
    const health = new PlatformHealth(shell);

    bootstrap.start();
    expect(health.isReady()).toBe(true);

    shell.stop();
    expect(health.isReady()).toBe(false);
  });
});
