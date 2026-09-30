import { describe, expect, it } from "vitest";
import { BaseModule } from "../../module-contract/module-contract";

class TestModule extends BaseModule {
  constructor(moduleMetadata: { id: string; name: string; version: string }) { super(moduleMetadata); }
  initializedCount = 0;
  disposedCount = 0;
  protected onInitialize(): void { this.initializedCount++; }
  protected onDispose(): void { this.disposedCount++; }
}

const moduleMetadata = { id: "demo-module", name: "Demo Module", version: "1.0.0" };

describe("Module Contract stage 4", () => {
  it("initializes and disposes a module", () => {
    const module = new TestModule(moduleMetadata);
    expect(module.isInitialized()).toBe(false);
    module.initialize({ ownerCoreId: "demo-core" });
    expect(module.isInitialized()).toBe(true);
    expect(module.initializedCount).toBe(1);
    module.dispose();
    expect(module.isInitialized()).toBe(false);
    expect(module.disposedCount).toBe(1);
  });

  it("makes initialization idempotent", () => {
    const module = new TestModule(moduleMetadata);
    module.initialize({ ownerCoreId: "demo-core" });
    module.initialize({ ownerCoreId: "demo-core" });
    expect(module.initializedCount).toBe(1);
  });

  it("rejects an empty owner core id", () => {
    const module = new TestModule(moduleMetadata);
    expect(() => module.initialize({ ownerCoreId: "" })).toThrow("owner core id");
  });
});
