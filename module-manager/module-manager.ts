import type { Core, CoreContext } from "../core-api/core-api";
import type { CoreMetadata } from "../core-registry/core-registry";

export interface ManagedCore {
  readonly core: Core;
  readonly metadata: CoreMetadata;
}

export class ModuleManager {
  private readonly cores = new Map<string, ManagedCore>();

  register(core: Core): void {
    const id = core.metadata.id;
    if (this.cores.has(id)) throw new Error(`Core "${id}" is already managed.`);
    this.cores.set(id, { core, metadata: core.metadata });
  }

  unregister(id: string): boolean {
    const managed = this.cores.get(id);
    if (!managed) return false;
    if (managed.core.getStatus() === "running") managed.core.stop();
    return this.cores.delete(id);
  }

  start(id: string): void {
    const managed = this.require(id);
    const context: CoreContext = { core: managed.metadata };
    managed.core.start(context);
  }

  stop(id: string): void {
    this.require(id).core.stop();
  }

  get(id: string): Core | undefined {
    return this.cores.get(id)?.core;
  }

  list(): readonly ManagedCore[] {
    return [...this.cores.values()];
  }

  startAll(): void {
    for (const managed of this.cores.values()) {
      this.start(managed.metadata.id);
    }
  }

  stopAll(): void {
    for (const managed of [...this.cores.values()].reverse()) {
      this.stop(managed.metadata.id);
    }
  }

  private require(id: string): ManagedCore {
    const managed = this.cores.get(id);
    if (!managed) throw new Error(`Core "${id}" is not managed.`);
    return managed;
  }
}
