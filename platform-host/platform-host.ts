import type { PlatformShell } from "../platform-shell/platform-shell";
import type { Core } from "../core-api/core-api";

export type PlatformHostStatus = "created" | "starting" | "ready" | "stopping" | "stopped" | "failed";
export type PlatformHostTarget = "web" | "android" | "telegram" | "custom";

export interface PlatformHostManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly target: PlatformHostTarget;
}

export interface PlatformHostDiagnostics {
  readonly status: PlatformHostStatus;
  readonly manifest: PlatformHostManifest;
  readonly shellStatus: ReturnType<PlatformShell["getStatus"]>;
  readonly registeredCores: number;
  readonly startedCores: number;
  readonly startedAt: number | null;
  readonly stoppedAt: number | null;
  readonly error: Error | null;
}

export interface PlatformHostCoreResolver {
  resolve(id: string): Core | undefined;
}

export class PlatformHost implements PlatformHostCoreResolver {
  private status: PlatformHostStatus = "created";
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private error: Error | null = null;
  private readonly startedCoreIds = new Set<string>();

  constructor(
    readonly manifest: PlatformHostManifest,
    readonly shell: PlatformShell
  ) {
    if (!manifest.id.trim() || !manifest.name.trim() || !manifest.version.trim()) {
      throw new Error("Platform host manifest must contain id, name and version.");
    }
  }

  registerCore(core: Core): void {
    if (this.status !== "created" && this.status !== "stopped") {
      throw new Error("Cores can only be registered before start or after a full stop.");
    }
    if (this.shell.cores.has(core.metadata.id)) {
      throw new Error(`Core already registered: ${core.metadata.id}`);
    }
    this.shell.cores.register(core.metadata);
    this.coreInstances.set(core.metadata.id, core);
  }

  private readonly coreInstances = new Map<string, Core>();

  resolve(id: string): Core | undefined {
    return this.coreInstances.get(id);
  }

  start(): void {
    if (this.status === "ready") return;
    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Platform host cannot start while status is "${this.status}".`);
    }

    this.status = "starting";
    this.error = null;
    try {
      this.shell.start();
      for (const core of this.coreInstances.values()) {
        core.start({ core: core.metadata });
        this.startedCoreIds.add(core.metadata.id);
      }
      this.startedAt = Date.now();
      this.stoppedAt = null;
      this.status = "ready";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      this.stopStartedCores();
      try { this.shell.stop(); } catch { /* preserve original startup error */ }
      throw error;
    }
  }

  stop(): void {
    if (this.status === "created" || this.status === "stopped") return;
    if (this.status === "starting") throw new Error("Platform host cannot stop while starting.");
    if (this.status === "stopping") return;

    this.status = "stopping";
    try {
      this.stopStartedCores();
      this.shell.stop();
      this.stoppedAt = Date.now();
      this.status = "stopped";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      throw error;
    }
  }

  getStatus(): PlatformHostStatus {
    return this.status;
  }

  getDiagnostics(): PlatformHostDiagnostics {
    return Object.freeze({
      status: this.status,
      manifest: this.manifest,
      shellStatus: this.shell.getStatus(),
      registeredCores: this.coreInstances.size,
      startedCores: this.startedCoreIds.size,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      error: this.error
    });
  }

  private stopStartedCores(): void {
    for (const id of [...this.startedCoreIds].reverse()) {
      const core = this.coreInstances.get(id);
      if (core) core.stop();
      this.startedCoreIds.delete(id);
    }
  }
}
