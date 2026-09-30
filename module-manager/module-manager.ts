import type { Module, ModuleContext, ModuleMetadata } from "../module-contract/module-contract";

export interface ModulePackage { readonly metadata: ModuleMetadata; readonly create: () => Module; }
export interface ModuleSource { discover(): readonly ModulePackage[]; }
export interface ModuleRecord extends ModulePackage { readonly state: "installed" | "enabled" | "disabled"; }

export class ModuleManager {
  private readonly modules = new Map<string, ModuleRecord>();

  discover(source: ModuleSource): readonly ModulePackage[] { return source.discover(); }

  install(pkg: ModulePackage): void {
    this.validate(pkg);
    if (this.modules.has(pkg.metadata.id)) throw new Error(`Module "${pkg.metadata.id}" is already installed.`);
    this.modules.set(pkg.metadata.id, { ...pkg, state: "installed" });
  }

  enable(id: string, context: ModuleContext): void {
    const record = this.require(id);
    if (record.state === "enabled") return;
    const instance = record.create();
    instance.initialize(context);
    this.modules.set(id, { ...record, create: () => instance, state: "enabled" });
  }

  disable(id: string): void {
    const record = this.require(id);
    if (record.state !== "enabled") return;
    const instance = record.create();
    instance.dispose();
    this.modules.set(id, { ...record, create: () => instance, state: "disabled" });
  }

  uninstall(id: string): boolean {
    const record = this.modules.get(id);
    if (!record) return false;
    if (record.state === "enabled") throw new Error(`Module "${id}" must be disabled before uninstall.`);
    return this.modules.delete(id);
  }

  update(id: string, next: ModulePackage): void {
    const current = this.require(id);
    this.validate(next);
    if (next.metadata.id !== id) throw new Error("Updated module id must match the installed module.");
    if (current.state === "enabled") throw new Error("Enabled modules must be disabled before update.");
    this.modules.set(id, { ...next, state: "installed" });
  }

  rollback(id: string, previous: ModulePackage): void { this.update(id, previous); }

  get(id: string): ModuleRecord | undefined { return this.modules.get(id); }
  list(): readonly ModuleRecord[] { return [...this.modules.values()]; }

  private validate(pkg: ModulePackage): void {
    const metadata = pkg.metadata;
    if (!metadata.id.trim() || !metadata.name.trim() || !metadata.version.trim()) {
      throw new Error("Module metadata must contain id, name and version.");
    }
    if (typeof pkg.create !== "function") throw new Error("Module package must provide a factory.");
  }

  private require(id: string): ModuleRecord {
    const record = this.modules.get(id);
    if (!record) throw new Error(`Module "${id}" is not installed.`);
    return record;
  }
}