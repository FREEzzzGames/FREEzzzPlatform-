export type RuntimeStatus =
  | "created"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed";

export interface RuntimeConfig {
  readonly name?: string;
  readonly version?: string;
  readonly environment?: "development" | "test" | "production";
}

export interface RuntimeDiagnostics {
  readonly status: RuntimeStatus;
  readonly startedAt: number | null;
  readonly stoppedAt: number | null;
  readonly uptimeMs: number;
  readonly error: Error | null;
}

/**
 * Stage 1 Runtime.
 *
 * Later-stage systems are deliberately absent.
 */
export class Runtime {
  private status: RuntimeStatus = "created";
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private error: Error | null = null;

  readonly name: string;
  readonly version: string;
  readonly environment: NonNullable<RuntimeConfig["environment"]>;

  constructor(config: RuntimeConfig = {}) {
    this.name = config.name ?? "FREEzzz Platform";
    this.version = config.version ?? "0.1.0-runtime";
    this.environment = config.environment ?? "development";
  }

  start(): void {
    if (this.status === "running") return;

    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Runtime cannot start while status is "${this.status}".`);
    }

    this.status = "starting";
    this.error = null;

    try {
      this.startedAt = Date.now();
      this.stoppedAt = null;
      this.status = "running";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      throw error;
    }
  }

  stop(): void {
    if (this.status === "stopped" || this.status === "created") return;

    if (this.status === "starting") {
      throw new Error("Runtime cannot stop while it is starting.");
    }

    if (this.status === "stopping") return;

    this.status = "stopping";
    this.stoppedAt = Date.now();
    this.status = "stopped";
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  getDiagnostics(now = Date.now()): RuntimeDiagnostics {
    const uptimeMs =
      this.startedAt === null
        ? 0
        : (this.stoppedAt ?? now) - this.startedAt;

    return {
      status: this.status,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      uptimeMs: Math.max(0, uptimeMs),
      error: this.error,
    };
  }
}
