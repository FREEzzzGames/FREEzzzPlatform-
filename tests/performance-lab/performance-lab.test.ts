import { describe, expect, it } from "vitest";
import { PerformanceLab } from "../performance-lab/performance-lab";

describe("PerformanceLab", () => {
  it("registers and runs independent benchmarks", () => {
    const lab = new PerformanceLab();
    lab.register({ id: "cpu-baseline", version: "1", target: "nes", run: () => [
      { metric: "cpu", value: 10, unit: "ms", timestamp: 1 },
      { metric: "cpu", value: 20, unit: "ms", timestamp: 2 }
    ]});
    expect(lab.run("cpu-baseline")).toHaveLength(2);
    expect(lab.summarize("cpu")).toEqual({ metric: "cpu", count: 2, min: 10, max: 20, average: 15 });
  });
  it("rejects duplicate benchmarks and invalid samples", () => {
    const lab = new PerformanceLab();
    const benchmark = { id: "b", version: "1", target: "test", run: () => [] };
    lab.register(benchmark);
    expect(() => lab.register(benchmark)).toThrow();
    lab.unregister("b");
    lab.register({ ...benchmark, run: () => [{ metric: "frame", value: Number.NaN, unit: "ms", timestamp: 1 }] });
    expect(() => lab.run("b")).toThrow();
  });
  it("clears collected samples without affecting benchmarks", () => {
    const lab = new PerformanceLab();
    lab.register({ id: "b", version: "1", target: "test", run: () => [{ metric: "memory", value: 4, unit: "mb", timestamp: 1 }] });
    lab.run("b"); lab.clearSamples();
    expect(lab.getSamples()).toHaveLength(0);
    expect(lab.list()).toHaveLength(1);
  });
});
