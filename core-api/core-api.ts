import type { CoreMetadata } from "../core-registry/core-registry";

export type CoreStatus = "created" | "starting" | "running" | "stopping" | "stopped" | "failed";

export interface CoreContext {
  readonly core: CoreMetadata;
}

export interface CoreDiagnostics {
  readonly status: CoreStatus;
  readonly startedAt: number | null;
  readonly stoppedAt: number | null;
  readonly error: Error | null;
}

export interface Core {
  readonly metadata: CoreMetadata;
  start(context: CoreContext): void;
  stop(): void;
  getStatus(): CoreStatus;
  getDiagnostics(now?: number): CoreDiagnostics;
}

export abstract class BaseCore implements Core {
  readonly metadata: CoreMetadata;
  protected status: CoreStatus = "created";
  protected startedAt: number | null = null;
  protected stoppedAt: number | null = null;
  protected error: Error | null = null;

  protected constructor(metadata: CoreMetadata) {
    if (!metadata.id.trim() || !metadata.name.trim() || !metadata.version.trim()) {
      throw new Error("Core metadata must contain id, name and version.");
    }
    this.metadata = Object.freeze({ ...metadata });
  }

  start(context: CoreContext): void {
    if (this.status === "running") return;
    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Core cannot start while status is "${this.status}".`);
    }
    this.status = "starting";
    this.error = null;
    try {
      this.onStart(context);
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
    if (this.status === "created" || this.status === "stopped") return;
    if (this.status === "starting") throw new Error("Core cannot stop while it is starting.");
    if (this.status === "stopping") return;
    this.status = "stopping";
    this.onStop();
    this.stoppedAt = Date.now();
    this.status = "stopped";
  }

  getStatus(): CoreStatus { return this.status; }

  getDiagnostics(now = Date.now()): CoreDiagnostics {
    return {
      status: this.status,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      error: this.error
    };
  }

  protected onStart(_context: CoreContext): void {}
  protected onStop(): void {}
}
