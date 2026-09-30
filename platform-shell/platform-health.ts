import type { PlatformShell } from "./platform-shell";

export type PlatformHealthStatus = "unknown" | "healthy" | "unhealthy";

export interface PlatformHealthCheck {
  readonly id: string;
  readonly status: PlatformHealthStatus;
  readonly message: string;
}

export interface PlatformHealthReport {
  readonly status: PlatformHealthStatus;
  readonly checks: readonly PlatformHealthCheck[];
  readonly checkedAt: number;
}

export class PlatformHealth {
  constructor(private readonly shell: PlatformShell) {}

  check(now = Date.now()): PlatformHealthReport {
    const diagnostics = this.shell.getDiagnostics();
    const checks: PlatformHealthCheck[] = [
      {
        id: "shell",
        status: diagnostics.status === "ready" ? "healthy" : "unhealthy",
        message: diagnostics.status === "ready" ? "Platform shell is ready." : `Platform shell is ${diagnostics.status}.`
      },
      {
        id: "runtime",
        status: diagnostics.runtime.status === "running" ? "healthy" : "unhealthy",
        message: diagnostics.runtime.status === "running" ? "Runtime is running." : `Runtime is ${diagnostics.runtime.status}.`
      },
      {
        id: "bootstrap",
        status: diagnostics.status === "ready" && diagnostics.runtime.status === "running" ? "healthy" : "unhealthy",
        message: diagnostics.status === "ready" && diagnostics.runtime.status === "running" ? "Platform bootstrap is complete." : "Platform bootstrap is not ready."
      }
    ];
    return {
      status: checks.every((check) => check.status === "healthy") ? "healthy" : "unhealthy",
      checks,
      checkedAt: now
    };
  }

  isReady(): boolean {
    return this.check().status === "healthy";
  }
}
