import { describe, expect, it } from "vitest";
import {
  NativePerformanceAdapterRegistry,
  NativePerformanceRegistry,
  type NativePerformanceBackend,
  type NativePerformanceEngine
} from "../../native-performance/native-performance";

function engine(id: string): NativePerformanceEngine {
  let status: NativePerformanceEngine["getStatus"] extends () => infer S ? S : never = "created";
  return {
    backendId: id,
    capabilities: { cpu: true, gpu: true, audio: true, wasm: true, native: false },
    initialize: () => { status = "ready"; },
    start: () => { status = "running"; },
    stop: () => { status = "stopped"; },
    executeCpu: () => undefined,
    submitGpu: () => undefined,
    submitAudio: () => undefined,
    getStatus: () => status
  };
}

describe("Native Performance Core stage 12", () => {
  it("registers independent high-performance backends", () => {
    const registry = new NativePerformanceRegistry();
    const backend: NativePerformanceBackend = {
      id: "wasm-test",
      version: "1.0.0",
      capabilities: { cpu: true, gpu: true, audio: true, wasm: true, native: false },
      createEngine: () => engine("wasm-test")
    };

    registry.register(backend);
    expect(registry.require("wasm-test")).toBe(backend);
    expect(registry.list()).toHaveLength(1);

    const runtime = backend.createEngine();
    runtime.initialize();
    runtime.start();
    runtime.executeCpu(10);
    runtime.stop();
    expect(runtime.getStatus()).toBe("stopped");
  });

  it("resolves Android native and WebAssembly adapters independently", () => {
    const registry = new NativePerformanceAdapterRegistry();
    const capabilities = { cpu: true, gpu: true, audio: true, wasm: true, native: false };

    const wasm = {
      id: "wasm",
      version: "1.0.0",
      target: "webassembly" as const,
      supports: (value: typeof capabilities) => value.wasm,
      createBackend: () => ({
        id: "wasm-backend",
        version: "1.0.0",
        capabilities,
        createEngine: () => engine("wasm-backend")
      })
    };

    const android = {
      id: "android-native",
      version: "1.0.0",
      target: "android-native" as const,
      supports: (value: typeof capabilities) => value.cpu,
      createBackend: () => ({
        id: "android-backend",
        version: "1.0.0",
        capabilities: { ...capabilities, native: true, wasm: false },
        createEngine: () => engine("android-backend")
      })
    };

    registry.register(wasm);
    registry.register(android);

    expect(registry.resolve("webassembly", capabilities)).toBe(wasm);
    expect(registry.resolve("android-native", capabilities)).toBe(android);
  });
});
