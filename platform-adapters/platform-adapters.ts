import type { PlatformHost, PlatformHostManifest, PlatformHostTarget } from "./platform-host";
import { PlatformShell } from "../platform-shell/platform-shell";

export interface PlatformAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: PlatformHostTarget;
  supports(target: PlatformHostTarget): boolean;
  createHost(shell: PlatformShell, manifest: PlatformHostManifest): PlatformHost;
}

export class PlatformAdapterRegistry {
  private readonly adapters = new Map<string, PlatformAdapter>();
  register(adapter: PlatformAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) throw new Error("Platform adapter must contain id and version.");
    if (this.adapters.has(adapter.id)) throw new Error("Platform adapter already exists: " + adapter.id);
    this.adapters.set(adapter.id, adapter);
  }
  get(id: string): PlatformAdapter | undefined { return this.adapters.get(id); }
  list(): readonly PlatformAdapter[] { return [...this.adapters.values()]; }
  resolve(target: PlatformHostTarget): PlatformAdapter {
    for (const adapter of this.adapters.values()) if (adapter.supports(target)) return adapter;
    throw new Error("No platform adapter supports target: " + target);
  }
}

export class PlatformHostAdapterFactory {
  constructor(readonly adapters: PlatformAdapterRegistry = new PlatformAdapterRegistry()) {}
  create(shell: PlatformShell, manifest: PlatformHostManifest): PlatformHost {
    return this.adapters.resolve(manifest.target).createHost(shell, manifest);
  }
}
