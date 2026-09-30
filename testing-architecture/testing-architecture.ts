export type TestLayer = "unit" | "contract" | "integration" | "architecture" | "conformance";

export interface TestDescriptor {
  readonly id: string;
  readonly layer: TestLayer;
  readonly target: string;
  readonly description: string;
}

export interface TestResult {
  readonly descriptorId: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly error?: string;
}

export interface TestSuite {
  readonly id: string;
  readonly version: string;
  readonly descriptors: readonly TestDescriptor[];
  run(): readonly TestResult[];
}

export class TestArchitectureRegistry {
  private readonly suites = new Map<string, TestSuite>();
  register(suite: TestSuite): void {
    if (!suite.id.trim() || !suite.version.trim()) throw new Error("Test suite id and version must not be empty.");
    if (this.suites.has(suite.id)) throw new Error(`Test suite already registered: ${suite.id}`);
    this.suites.set(suite.id, suite);
  }
  unregister(id: string): boolean { return this.suites.delete(id); }
  get(id: string): TestSuite | undefined { return this.suites.get(id); }
  list(): readonly TestSuite[] { return Object.freeze([...this.suites.values()]); }
  clear(): void { this.suites.clear(); }
}

export class TestArchitecture {
  readonly suites = new TestArchitectureRegistry();
  runSuite(id: string): readonly TestResult[] {
    const suite = this.suites.get(id);
    if (!suite) throw new Error(`Unknown test suite: ${id}`);
    return Object.freeze([...suite.run()]);
  }
  runAll(): readonly TestResult[] {
    return Object.freeze(this.suites.list().flatMap(suite => [...suite.run()]));
  }
  summarize(results: readonly TestResult[]): { readonly passed: number; readonly failed: number; readonly total: number } {
    const passed = results.filter(result => result.passed).length;
    return Object.freeze({ passed, failed: results.length - passed, total: results.length });
  }
}
