import type { PlatformShell } from "./platform-shell";

export type PlatformBootstrapStatus = "idle" | "starting" | "ready" | "failed";

export interface PlatformBootstrapDiagnostics {
  readonly status: PlatformBootstrapStatus;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly durationMs: number;
  readonly error: Error | null;
}

export class PlatformBootstrap {
  private status: PlatformBootstrapStatus = "idle";
  private startedAt: number | null = null;
  private completedAt: number | null = null;
  private error: Error | null = null;

  constructor(private readonly shell: PlatformShell) {}

  start(): void {
    if (this.status === "ready") return;
    if (this.status === "starting") throw new Error("Platform bootstrap is already starting.");

    this.status = "starting";
    this.startedAt = Date.now();
    this.completedAt = null;
    this.error = null;

    try {
      this.shell.start();
      this.completedAt = Date.now();
      this.status = "ready";
    } catch (cause) {
      this.error = cause instanceof Error ? cause : new Error(String(cause));
      this.status = "failed";
      throw this.error;
    }
  }

  getDiagnostics(now = Date.now()): PlatformBootstrapDiagnostics {
    const end = this.completedAt ?? now;
    return {
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      durationMs: this.startedAt === null ? 0 : Math.max(0, end - this.startedAt),
      error: this.error
    };
  }
}
