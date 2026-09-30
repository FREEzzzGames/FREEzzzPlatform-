import { describe, expect, it } from "vitest";
import { TestArchitecture } from "../testing-architecture/testing-architecture";

describe("TestingArchitecture", () => {
  it("registers and resolves independent suites", () => {
    const architecture = new TestArchitecture();
    architecture.suites.register({
      id: "runtime", version: "1", descriptors: [{ id: "runtime.start", layer: "unit", target: "runtime", description: "runtime start" }],
      run: () => [{ descriptorId: "runtime.start", passed: true, durationMs: 1 }]
    });
    expect(architecture.suites.get("runtime")?.id).toBe("runtime");
  });
  it("runs suites and summarizes results", () => {
    const architecture = new TestArchitecture();
    architecture.suites.register({ id: "a", version: "1", descriptors: [], run: () => [{ descriptorId: "a1", passed: true, durationMs: 2 }, { descriptorId: "a2", passed: false, durationMs: 3, error: "failure" }] });
    const results = architecture.runAll();
    expect(architecture.summarize(results)).toEqual({ passed: 1, failed: 1, total: 2 });
  });
  it("rejects duplicate or unknown suites", () => {
    const architecture = new TestArchitecture();
    architecture.suites.register({ id: "a", version: "1", descriptors: [], run: () => [] });
    expect(() => architecture.suites.register({ id: "a", version: "1", descriptors: [], run: () => [] })).toThrow();
    expect(() => architecture.runSuite("missing")).toThrow();
  });
});
