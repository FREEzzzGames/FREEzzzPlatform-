export type AudioCoreStatus = "created" | "ready" | "running" | "stopped" | "failed";

export interface AudioFormat {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitsPerSample: number;
}

export interface AudioBuffer {
  readonly samples: Float32Array;
  readonly format: AudioFormat;
  readonly timestamp: number;
}

export interface AudioDevice {
  readonly id: string;
  readonly version: string;
  readonly format: AudioFormat;
  initialize(): void;
  start(): void;
  stop(): void;
  submit(buffer: AudioBuffer): void;
  drain(): AudioBuffer[];
  reset(): void;
  getStatus(): AudioCoreStatus;
}

export interface AudioAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: "web" | "android-native" | "telegram" | "custom";
  supports(deviceId: string): boolean;
  createDevice(): AudioDevice;
}

export class AudioRegistry {
  private readonly adapters = new Map<string, AudioAdapter>();

  register(adapter: AudioAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Audio adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Audio adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): AudioAdapter | undefined { return this.adapters.get(id); }
  list(): readonly AudioAdapter[] { return [...this.adapters.values()]; }

  resolve(deviceId: string, target: AudioAdapter["target"]): AudioAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(deviceId)) return adapter;
    }
    throw new Error(`No audio adapter supports "${deviceId}" for target "${target}".`);
  }
}

export class AudioMixer {
  private readonly queue: AudioBuffer[] = [];

  submit(buffer: AudioBuffer): void {
    this.validate(buffer);
    this.queue.push({
      ...buffer,
      samples: buffer.samples.slice()
    });
  }

  drain(): AudioBuffer[] {
    return this.queue.splice(0).map(buffer => ({
      ...buffer,
      samples: buffer.samples.slice()
    }));
  }

  reset(): void { this.queue.length = 0; }

  private validate(buffer: AudioBuffer): void {
    const { sampleRate, channels, bitsPerSample } = buffer.format;
    if (!Number.isInteger(sampleRate) || sampleRate <= 0) throw new Error("Audio sample rate must be positive.");
    if (!Number.isInteger(channels) || channels <= 0) throw new Error("Audio channel count must be positive.");
    if (bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
      throw new Error("Audio bits per sample must be 16, 24 or 32.");
    }
    if (!Number.isFinite(buffer.timestamp)) throw new Error("Audio timestamp must be finite.");
  }
}

export interface AudioCore {
  readonly status: AudioCoreStatus;
  readonly registry: AudioRegistry;
  readonly mixer: AudioMixer;
  initialize(): void;
  start(): void;
  stop(): void;
  reset(): void;
  submit(buffer: AudioBuffer): void;
  drain(): AudioBuffer[];
}

export class DefaultAudioCore implements AudioCore {
  private _status: AudioCoreStatus = "created";
  readonly registry = new AudioRegistry();
  readonly mixer = new AudioMixer();

  get status(): AudioCoreStatus { return this._status; }

  initialize(): void {
    if (this._status !== "created" && this._status !== "stopped") return;
    this._status = "ready";
  }

  start(): void {
    if (this._status === "running") return;
    if (this._status === "created") this.initialize();
    if (this._status !== "ready" && this._status !== "stopped") {
      throw new Error(`Audio core cannot start while status is "${this._status}".`);
    }
    this._status = "running";
  }

  stop(): void {
    if (this._status === "created" || this._status === "stopped") return;
    this._status = "stopped";
  }

  reset(): void { this.mixer.reset(); }

  submit(buffer: AudioBuffer): void {
    if (this._status !== "running") throw new Error("Audio core must be running before submitting audio.");
    this.mixer.submit(buffer);
  }

  drain(): AudioBuffer[] {
    return this.mixer.drain();
  }
}
