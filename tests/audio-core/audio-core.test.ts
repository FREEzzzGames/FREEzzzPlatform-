import { describe, expect, it } from "vitest";
import {
  AudioMixer,
  DefaultAudioCore,
  type AudioAdapter,
  type AudioDevice,
  type AudioBuffer
} from "../../audio-core/audio-core";

const format = { sampleRate: 44100, channels: 2, bitsPerSample: 32 } as const;

class TestDevice implements AudioDevice {
  readonly id = "test-device";
  readonly version = "1.0.0";
  readonly format = format;
  private status: "created" | "ready" | "running" | "stopped" = "created";
  private readonly buffers: AudioBuffer[] = [];

  initialize(): void { this.status = "ready"; }
  start(): void { this.status = "running"; }
  stop(): void { this.status = "stopped"; }
  submit(buffer: AudioBuffer): void { this.buffers.push(buffer); }
  drain(): AudioBuffer[] { return this.buffers.splice(0); }
  reset(): void { this.buffers.length = 0; this.status = "created"; }
  getStatus() { return this.status; }
}

class TestAdapter implements AudioAdapter {
  readonly id = "test-audio";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  supports(deviceId: string): boolean { return deviceId === "test-device"; }
  createDevice(): AudioDevice { return new TestDevice(); }
}

describe("Stage 16 — Audio Core", () => {
  it("queues audio with mutation isolation", () => {
    const mixer = new AudioMixer();
    const samples = new Float32Array([0.1, 0.2]);
    const buffer: AudioBuffer = { samples, format, timestamp: 1 };
    mixer.submit(buffer);
    samples[0] = 9;
    const drained = mixer.drain();
    expect(drained).toHaveLength(1);
    expect(drained[0].samples).toEqual(new Float32Array([0.1, 0.2]));
  });

  it("resolves target-specific adapters", () => {
    const core = new DefaultAudioCore();
    const adapter = new TestAdapter();
    core.registry.register(adapter);
    expect(core.registry.resolve("test-device", "custom")).toBe(adapter);
    expect(() => core.registry.resolve("test-device", "web")).toThrow();
  });

  it("enforces lifecycle before submission", () => {
    const core = new DefaultAudioCore();
    const buffer: AudioBuffer = { samples: new Float32Array([0]), format, timestamp: 0 };
    expect(() => core.submit(buffer)).toThrow();
    core.start();
    core.submit(buffer);
    expect(core.drain()).toHaveLength(1);
    core.reset();
    expect(core.drain()).toHaveLength(0);
  });
});
