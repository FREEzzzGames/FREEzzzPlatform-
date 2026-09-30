import type { Storage } from "../storage/storage";

export type EmulatorStatus = "created" | "starting" | "running" | "stopping" | "stopped" | "failed";

export interface EmulatorMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

export interface CPU {
  reset(): void;
  step(): void;
}

export interface Memory {
  readonly size: number;
  read(address: number, length: number): Uint8Array;
  write(address: number, data: Uint8Array): void;
}

export interface Video {
  readonly width: number;
  readonly height: number;
  present(frame: Uint8Array): void;
}

export interface Audio {
  readonly sampleRate: number;
  push(samples: Float32Array): void;
}

export interface Input {
  poll(): readonly number[];
}

export interface Timing {
  now(): number;
  wait(milliseconds: number): void;
}

export interface EmulatorComponents {
  readonly cpu: CPU;
  readonly memory: Memory;
  readonly video: Video;
  readonly audio: Audio;
  readonly input: Input;
  readonly timing: Timing;
  readonly storage: Storage;
}

export interface EmulatorContext {
  readonly emulator: EmulatorMetadata;
}

export interface EmulatorDiagnostics {
  readonly status: EmulatorStatus;
  readonly startedAt: number | null;
  readonly stoppedAt: number | null;
  readonly error: Error | null;
}

export interface Emulator {
  readonly metadata: EmulatorMetadata;
  start(context: EmulatorContext): void;
  stop(): void;
  reset(): void;
  runFrame(): void;
  getStatus(): EmulatorStatus;
  getDiagnostics(): EmulatorDiagnostics;
}

export abstract class BaseEmulatorCore implements Emulator {
  readonly metadata: EmulatorMetadata;
  protected status: EmulatorStatus = "created";
  protected startedAt: number | null = null;
  protected stoppedAt: number | null = null;
  protected error: Error | null = null;
  protected readonly components: EmulatorComponents;

  protected constructor(metadata: EmulatorMetadata, components: EmulatorComponents) {
    if (!metadata.id.trim() || !metadata.name.trim() || !metadata.version.trim()) {
      throw new Error("Emulator metadata must contain id, name and version.");
    }
    this.validateComponents(components);
    this.metadata = Object.freeze({ ...metadata });
    this.components = components;
  }

  start(context: EmulatorContext): void {
    if (this.status === "running") return;
    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Emulator cannot start while status is "${this.status}".`);
    }
    this.status = "starting";
    this.error = null;
    try {
      this.onStart(context);
      this.components.cpu.reset();
      this.startedAt = this.components.timing.now();
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
    if (this.status === "starting") throw new Error("Emulator cannot stop while it is starting.");
    if (this.status === "stopping") return;
    this.status = "stopping";
    this.onStop();
    this.stoppedAt = this.components.timing.now();
    this.status = "stopped";
  }

  reset(): void {
    if (this.status !== "running") throw new Error("Emulator must be running before reset.");
    this.components.cpu.reset();
    this.onReset();
  }

  runFrame(): void {
    if (this.status !== "running") throw new Error("Emulator must be running before runFrame.");
    this.onFrame(this.components);
  }

  getStatus(): EmulatorStatus {
    return this.status;
  }

  getDiagnostics(): EmulatorDiagnostics {
    return {
      status: this.status,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      error: this.error
    };
  }

  protected onStart(_context: EmulatorContext): void {}
  protected onStop(): void {}
  protected onReset(): void {}
  protected onFrame(_components: EmulatorComponents): void {}

  private validateComponents(components: EmulatorComponents): void {
    if (!components || !components.cpu || !components.memory || !components.video ||
        !components.audio || !components.input || !components.timing || !components.storage) {
      throw new Error("Emulator components must provide CPU, Memory, Video, Audio, Input, Timing and Storage.");
    }
  }
}

export interface EmulatorAdapter {
  readonly id: string;
  readonly version: string;
  supports(emulatorId: string): boolean;
  create(components: EmulatorComponents): Emulator;
}

export class EmulatorAdapterRegistry {
  private readonly adapters = new Map<string, EmulatorAdapter>();

  register(adapter: EmulatorAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Emulator adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Emulator adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  get(id: string): EmulatorAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): readonly EmulatorAdapter[] {
    return [...this.adapters.values()];
  }

  resolve(emulatorId: string): EmulatorAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.supports(emulatorId)) return adapter;
    }
    throw new Error(`No emulator adapter supports "${emulatorId}".`);
  }
}
