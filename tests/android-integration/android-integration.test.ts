import { describe, expect, it } from "vitest";
import { AndroidIntegration, type AndroidHost, type AndroidHostAdapter, type AndroidIntent } from "../../android-integration/android-integration";

class TestAndroidHost implements AndroidHost {
  readonly id = "test-android"; readonly version = "1.0.0";
  private status: "created" | "ready" | "running" | "stopped" = "created";
  readonly intents: AndroidIntent[] = [];
  initialize(_app: { readonly id: string; readonly packageName: string; readonly version: string }): void { this.status = "ready"; }
  start(): void { this.status = "running"; }
  stop(): void { this.status = "stopped"; }
  dispatchIntent(intent: AndroidIntent): void { if (this.status !== "running") throw new Error("Host must be running."); this.intents.push({ ...intent }); }
  getWindow() { return { width: 1080, height: 1920, density: 3 }; }
  getStatus() { return this.status; }
}
class TestAndroidAdapter implements AndroidHostAdapter {
  readonly id = "test-adapter"; readonly version = "1.0.0"; readonly host = new TestAndroidHost();
  supports(hostId: string): boolean { return hostId === this.host.id; }
  createHost(): AndroidHost { return this.host; }
}
const app = { id: "freezzz-platform", packageName: "com.freezzz.platform", version: "1.0.0" };

describe("AndroidIntegration", () => {
  it("runs through an Android host adapter", () => {
    const integration = new AndroidIntegration(); const adapter = new TestAndroidAdapter();
    integration.hosts.register(adapter); integration.initialize(app); integration.selectHost("test-android"); integration.start();
    expect(integration.status).toBe("running"); expect(adapter.host.getStatus()).toBe("running");
    integration.stop(); expect(integration.status).toBe("stopped");
  });
  it("routes lifecycle events and intents", () => {
    const integration = new AndroidIntegration(); const adapter = new TestAndroidAdapter();
    integration.hosts.register(adapter); integration.initialize(app); integration.selectHost("test-android");
    const events: string[] = []; integration.lifecycle.on("create", event => events.push(event)); integration.lifecycle.on("start", event => events.push(event)); integration.lifecycle.on("resume", event => events.push(event));
    integration.start(); integration.dispatchIntent({ action: "OPEN_TEST", data: "freezzz://test" });
    expect(events).toEqual(["create", "start", "resume"]); expect(adapter.host.intents).toHaveLength(1);
  });
  it("keeps the platform independent from Android SDK types", () => {
    const integration = new AndroidIntegration(); expect(() => integration.start()).toThrow(); expect(integration.status).toBe("created");
  });
  it("rejects duplicate hosts and invalid intents", () => {
    const integration = new AndroidIntegration(); const adapter = new TestAndroidAdapter();
    integration.hosts.register(adapter); expect(() => integration.hosts.register(adapter)).toThrow();
    integration.initialize(app); integration.selectHost("test-android"); integration.start(); expect(() => integration.dispatchIntent({ action: "" })).toThrow();
  });
});
