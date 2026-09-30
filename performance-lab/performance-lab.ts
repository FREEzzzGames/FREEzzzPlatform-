export type PerformanceMetric = "cpu" | "gpu" | "audio" | "frame" | "memory" | "custom";

export interface PerformanceSample {
  readonly metric: PerformanceMetric;
  readonly value: number;
  readonly unit: string;
  readonly timestamp: number;
}

export interface PerformanceBenchmark {
  readonly id: string;
  readonly version: string;
  readonly target: string;
  run(): readonly PerformanceSample[];
}

export interface PerformanceSummary {
  readonly metric: PerformanceMetric;
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly average: number;
}

export class PerformanceLab {
  private readonly benchmarks = new Map<string, PerformanceBenchmark>();
  private readonly samples: PerformanceSample[] = [];

  register(benchmark: PerformanceBenchmark): void {
    if (!benchmark.id.trim() || !benchmark.version.trim() || !benchmark.target.trim()) {
      throw new Error("Performance benchmark must contain id, version and target.");
    }
    if (this.benchmarks.has(benchmark.id)) throw new Error(`Performance benchmark already registered: ${benchmark.id}`);
    this.benchmarks.set(benchmark.id, benchmark);
  }

  unregister(id: string): boolean { return this.benchmarks.delete(id); }
  list(): readonly PerformanceBenchmark[] { return Object.freeze([...this.benchmarks.values()]); }

  run(id: string): readonly PerformanceSample[] {
    const benchmark = this.benchmarks.get(id);
    if (!benchmark) throw new Error(`Unknown performance benchmark: ${id}`);
    const results = benchmark.run();
    for (const sample of results) {
      if (!Number.isFinite(sample.value)) throw new Error("Performance sample value must be finite.");
      this.samples.push(Object.freeze({ ...sample }));
    }
    return Object.freeze([...results]);
  }

  getSamples(): readonly PerformanceSample[] { return Object.freeze([...this.samples]); }

  summarize(metric: PerformanceMetric): PerformanceSummary | undefined {
    const values = this.samples.filter(sample => sample.metric === metric).map(sample => sample.value);
    if (values.length === 0) return undefined;
    const min = Math.min(...values); const max = Math.max(...values);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Object.freeze({ metric, count: values.length, min, max, average });
  }

  clearSamples(): void { this.samples.length = 0; }
}
