import { describe, expect, it } from "vitest";
import { BaseCore } from "../../core-api/core-api";
import { PlatformHost } from "../../platform-host/platform-host";
import { PlatformShell } from "../../platform-shell/platform-shell";

const manifest = {
  id: "freezzz-host",
  name: "FREEzzz Platform Host",
  version: "1.0.0",
  target: "web" as const
};

const coreMetadata = { id: "demo-core", name: "Demo Core", version: "1.0.0" };

class DemoCore extends BaseCore {
  constructor() { super(coreMetadata); }
}

describe("PlatformHost", () => {
  it("composes the shell and starts registered cores", () => {
    const shell = new PlatformShell();
    const host = new PlatformHost(manifest, shell);
    const core = new DemoCore();

    host.registerCore(core);
    host.start();

    expect(host.getStatus()).toBe("ready");
    expect(core.getStatus()).toBe("running");
    expect(host.resolve("demo-core")).toBe(core);
    expect(host.getDiagnostics().registeredCores).toBe(1);
    expect(host.getDiagnostics().startedCores).toBe(1);
  });

  it("stops cores before stopping the shell", () => {
    const shell = new PlatformShell();
    const host = new PlatformHost(manifest, shell);
    const core = new DemoCore();

    host.registerCore(core);
    host.start();
    host.stop();

    expect(core.getStatus()).toBe("stopped");
    expect(shell.getStatus()).toBe("stopped");
    expect(host.getStatus()).toBe("stopped");
  });

  it("rejects duplicate cores and registration while running", () => {
    const shell = new PlatformShell();
    const host = new PlatformHost(manifest, shell);
    host.registerCore(new DemoCore());

    expect(() => host.registerCore(new DemoCore())).toThrow("Core already registered");
    host.start();
    expect(() => host.registerCore(new BaseTestCore())).toThrow("only be registered");
  });

  it("keeps the platform independent from target SDKs", () => {
    const shell = new PlatformShell();
    const host = new PlatformHost(manifest, shell);
    expect(host.manifest.target).toBe("web");
    expect("window" in host).toBe(false);
    expect("Telegram" in host).toBe(false);
  });
});

class BaseTestCore extends BaseCore {
  constructor() { super({ id: "other-core", name: "Other Core", version: "1.0.0" }); }
}
