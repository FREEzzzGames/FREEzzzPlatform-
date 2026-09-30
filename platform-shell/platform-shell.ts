import { Runtime } from "../runtime/runtime";
import { CoreRegistry } from "../core-registry/core-registry";
import { ModuleManager } from "../module-manager/module-manager";
import { CapabilityRegistry } from "../capability-api/capability-api";
import { EventBus } from "../event-bus/event-bus";
import { Configuration } from "../configuration/configuration";
import { MemoryStorage } from "../storage/storage";

export interface PlatformShellStatus {
  readonly runtime: ReturnType<Runtime["getDiagnostics"]>;
  readonly cores: number;
  readonly modules: number;
  readonly capabilities: number;
}

export class PlatformShell {
  readonly runtime = new Runtime({ name: "FREEzzz Platform", version: "0.1.0", environment: "development" });
  readonly cores = new CoreRegistry();
  readonly modules = new ModuleManager();
  readonly capabilities = new CapabilityRegistry();
  readonly events = new EventBus();
  readonly configuration = new Configuration();
  readonly storage = new MemoryStorage();

  start(): void { this.runtime.start(); }
  stop(): void { this.runtime.stop(); }
  getStatus(): PlatformShellStatus {
    return { runtime: this.runtime.getDiagnostics(), cores: this.cores.list().length, modules: this.modules.list().length, capabilities: this.capabilities.list().length };
  }
}
