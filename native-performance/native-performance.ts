export type NativePerformanceStatus = "created" | "ready" | "running" | "stopped" | "failed";

export interface NativePerformanceCapabilities {
  readonly cpu: boolean;
  readonly gpu: boolean;
  readonly audio: boolean;
  readonly wasm: boolean;
  readonly native: boolean;
}

export interface NativePerformanceEngine {
  readonly backendId: string;
  readonly capabilities: NativePerformanceCapabilities;
  initialize(): void;
  start(): void;
  stop(): void;
  executeCpu(cycles: number): void;
  submitGpu(commandBuffer: Uint8Array): void;
  submitAudio(samples: Float32Array): void;
  getStatus(): NativePerformanceStatus;
}

export interface NativePerformanceBackend {
  readonly id: string;
  readonly version: string;
  readonly capabilities: NativePerformanceCapabilities;
  createEngine(): NativePerformanceEngine;
}

export class NativePerformanceRegistry {
  private readonly backends = new Map<string, NativePerformanceBackend>();

  register(backend: NativePerformanceBackend): void {
    if (!backend.id.trim() || !backend.version.trim()) {
      throw new Error("Native performance backend must contain id and version.");
    }
    if (this.backends.has(backend.id)) {
      throw new Error(`Native performance backend "${backend.id}" is already registered.`);
    }
    this.backends.set(backend.id, backend);
  }

  unregister(id: string): boolean {
    return this.backends.delete(id);
  }

  get(id: string): NativePerformanceBackend | undefined {
    return this.backends.get(id);
  }

  list(): readonly NativePerformanceBackend[] {
    return [...this.backends.values()];
  }

  require(id: string): NativePerformanceBackend {
    const backend = this.get(id);
    if (!backend) throw new Error(`Native performance backend "${id}" is not registered.`);
    return backend;
  }
}

export interface NativePerformanceAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: "android-native" | "webassembly";
  supports(capabilities: NativePerformanceCapabilities): boolean;
  createBackend(): NativePerformanceBackend;
}

export class NativePerformanceAdapterRegistry {
  private readonly adapters = new Map<string, NativePerformanceAdapter>();

  register(adapter: NativePerformanceAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Native performance adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Native performance adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  get(id: string): NativePerformanceAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): readonly NativePerformanceAdapter[] {
    return [...this.adapters.values()];
  }

  resolve(
    target: NativePerformanceAdapter["target"],
    capabilities: NativePerformanceCapabilities
  ): NativePerformanceAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(capabilities)) return adapter;
    }
    throw new Error(`No native performance adapter supports target "${target}".`);
  }
}
