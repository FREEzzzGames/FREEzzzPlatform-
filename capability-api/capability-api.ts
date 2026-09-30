export type CapabilityValue = unknown;

export interface Capability {
  readonly id: string;
  readonly version: string;
  readonly provide: () => CapabilityValue;
}

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, Capability>();

  register(capability: Capability): void {
    if (!capability.id.trim()) throw new Error("Capability id must not be empty.");
    if (!capability.version.trim()) throw new Error("Capability version must not be empty.");
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Capability "${capability.id}" is already registered.`);
    }
    this.capabilities.set(capability.id, capability);
  }

  unregister(id: string): boolean {
    return this.capabilities.delete(id);
  }

  has(id: string): boolean {
    return this.capabilities.has(id);
  }

  get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  require(id: string): Capability {
    const capability = this.get(id);
    if (!capability) throw new Error(`Capability "${id}" is not registered.`);
    return capability;
  }

  list(): readonly Capability[] {
    return [...this.capabilities.values()];
  }
}
