import { describe, expect, it } from "vitest";
import { PlatformHealth } from "../../platform-shell/platform-health";
import { PlatformShell } from "../../platform-shell/platform-shell";

describe("PlatformHealth", () => {
  it("reports unhealthy before bootstrap", () => {
    const health = new PlatformHealth(new PlatformShell());
    const report = health.check(123);
    expect(report.status).toBe("unhealthy");
    expect(report.checkedAt).toBe(123);
    expect(report.checks.map((check) => check.id)).toEqual(["shell", "runtime", "bootstrap"]);
  });

  it("reports healthy after shell startup", () => {
    const shell = new PlatformShell();
    shell.start();
    const health = new PlatformHealth(shell);
    const report = health.check(456);
    expect(report.status).toBe("healthy");
    expect(report.checks.every((check) => check.status === "healthy")).toBe(true);
    expect(health.isReady()).toBe(true);
  });
});
