import { describe, expect, it } from "vitest";
import { CapabilityRegistry } from "../../capability-api/capability-api";
import { ConfigStore } from "../../configuration/configuration";
import { EventBus } from "../../event-bus/event-bus";
import { CoreRegistry } from "../../core-registry/core-registry";
import { ModuleManager } from "../../module-manager/module-manager";
import { MemoryStorage } from "../../storage/storage";
import { BaseCore, type Core } from "../../core-api/core-api";
import { DefaultPlatformSDK } from "../../sdk/sdk";

class TestCore extends BaseCore {
  constructor() {
    super({ id: "core-a", name: "Core A", version: "1.0.0" });
  }
}

describe("SDK stage 10", () => {
  it("exposes the foundation through one stable dependency-injected API", () => {
    const cores = new CoreRegistry();
    const instance = new TestCore();
    const resolver = {
      getCore(id: string): Core | undefined {
        return id === instance.metadata.id ? instance : undefined;
      }
    };

    const sdk = new DefaultPlatformSDK({
      cores,
      modules: new ModuleManager(),
      capabilities: new CapabilityRegistry(),
      events: new EventBus(),
      configuration: new ConfigStore(),
      storage: new MemoryStorage(),
      coreResolver: resolver
    });

    expect(sdk.cores).toBe(cores);
    expect(sdk.getCore("core-a")).toBe(instance);
    expect(sdk.getCore("missing")).toBeUndefined();
    expect(sdk.modules).toBeInstanceOf(ModuleManager);
    expect(sdk.configuration).toBeInstanceOf(ConfigStore);
    expect(sdk.storage).toBeInstanceOf(MemoryStorage);
  });
});
