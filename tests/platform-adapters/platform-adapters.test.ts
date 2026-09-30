import { describe, expect, it } from "vitest";
import { PlatformAdapterRegistry, PlatformHostAdapterFactory } from "../../platform-adapters/platform-adapters";
import { WebPlatformAdapter } from "../../platform-adapters/web-adapter";
import { AndroidPlatformAdapter } from "../../platform-adapters/android-adapter";
import { TelegramPlatformAdapter } from "../../platform-adapters/telegram-adapter";
import { PlatformShell } from "../../platform-shell/platform-shell";

describe("Platform Adapters", () => {
  it("resolves independent web, android and telegram adapters", () => {
    const registry = new PlatformAdapterRegistry();
    registry.register(new WebPlatformAdapter());
    registry.register(new AndroidPlatformAdapter());
    registry.register(new TelegramPlatformAdapter());
    expect(registry.resolve("web").id).toBe("web");
    expect(registry.resolve("android").id).toBe("android");
    expect(registry.resolve("telegram").id).toBe("telegram");
  });

  it("creates target-specific hosts through one normalized factory", () => {
    const registry = new PlatformAdapterRegistry();
    registry.register(new WebPlatformAdapter());
    registry.register(new AndroidPlatformAdapter());
    registry.register(new TelegramPlatformAdapter());
    const factory = new PlatformHostAdapterFactory(registry);
    const shell = new PlatformShell();
    for (const target of ["web", "android", "telegram"] as const) {
      const host = factory.create(shell, { id: "host-" + target, name: "Host", version: "1.0.0", target });
      expect(host.manifest.target).toBe(target);
      host.start();
      expect(host.getStatus()).toBe("ready");
      host.stop();
    }
  });

  it("does not silently provide unsupported targets", () => {
    const registry = new PlatformAdapterRegistry();
    registry.register(new WebPlatformAdapter());
    expect(() => registry.resolve("custom")).toThrow(/No platform adapter/);
  });
});
