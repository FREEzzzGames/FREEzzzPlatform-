export interface CoreMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

export interface CoreRegistration extends CoreMetadata {
  readonly registeredAt: number;
}

/** Stage 2: core discovery and registration only. */
export class CoreRegistry {
  private readonly cores = new Map<string, CoreRegistration>();

  register(core: CoreMetadata): CoreRegistration {
    this.validate(core);
    if (this.cores.has(core.id)) {
      throw new Error(`Core "${core.id}" is already registered.`);
    }
    const registration = { ...core, registeredAt: Date.now() };
    this.cores.set(core.id, registration);
    return registration;
  }

  unregister(id: string): boolean { return this.cores.delete(id); }
  has(id: string): boolean { return this.cores.has(id); }
  get(id: string): CoreRegistration | undefined { return this.cores.get(id); }
  list(): readonly CoreRegistration[] { return [...this.cores.values()]; }
  clear(): void { this.cores.clear(); }

  private validate(core: CoreMetadata): void {
    if (!core.id.trim()) throw new Error("Core id must not be empty.");
    if (!core.name.trim()) throw new Error("Core name must not be empty.");
    if (!core.version.trim()) throw new Error("Core version must not be empty.");
  }
}
