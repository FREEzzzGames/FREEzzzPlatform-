import { Runtime } from "../runtime/runtime";
import { CoreRegistry } from "../core-registry/core-registry";
import { ModuleManager } from "../module-manager/module-manager";
import { CapabilityRegistry } from "../capability-api/capability-api";
import { EventBus } from "../event-bus/event-bus";
import { ConfigStore } from "../configuration/configuration";
import { MemoryStorage } from "../storage/storage";

export type PlatformShellStatus = "created" | "starting" | "ready" | "stopping" | "stopped" | "failed";

export interface PlatformShellDiagnostics {
  readonly status: PlatformShellStatus;
  readonly runtime: ReturnType<Runtime["getDiagnostics"]>;
  readonly cores: number;
  readonly modules: number;
  readonly capabilities: number;
  readonly configurationKeys: number;
  readonly storageKeys: number;
  readonly startedAt: number | null;
  readonly error: Error | null;
}

export class PlatformShell {
  readonly runtime = new Runtime({ name: "FREEzzz Platform", version: "0.1.0", environment: "development" });
  readonly cores = new CoreRegistry();
  readonly modules = new ModuleManager();
  readonly capabilities = new CapabilityRegistry();
  readonly events = new EventBus();
  readonly configuration = new ConfigStore();
  readonly storage = new MemoryStorage();

  private status: PlatformShellStatus = "created";
  private startedAt: number | null = null;
  private error: Error | null = null;

  start(): void {
    if (this.status === "ready") return;
    if (this.status === "starting" || this.status === "stopping") throw new Error(`Platform shell cannot start while status is "${this.status}".`);
    this.status = "starting";
    this.error = null;
    try {
      this.runtime.start();
      this.startedAt = Date.now();
      this.status = "ready";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      throw error;
    }
  }

  stop(): void {
    if (this.status === "created" || this.status === "stopped") return;
    if (this.status === "starting") throw new Error("Platform shell cannot stop while it is starting.");
    if (this.status === "stopping") return;
    this.status = "stopping";
    try {
      this.runtime.stop();
      this.status = "stopped";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      throw error;
    }
  }

  getStatus(): PlatformShellStatus { return this.status; }

  getDiagnostics(): PlatformShellDiagnostics {
    return {
      status: this.status,
      runtime: this.runtime.getDiagnostics(),
      cores: this.cores.list().length,
      modules: this.modules.list().length,
      capabilities: this.capabilities.list().length,
      configurationKeys: this.configuration.keys("platform").length,
      storageKeys: this.storage.keys().length,
      startedAt: this.startedAt,
      error: this.error
    };
  }
}
