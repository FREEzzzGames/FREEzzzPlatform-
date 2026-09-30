import { describe, expect, it } from "vitest";
import { TelegramIntegration, type TelegramClient, type TelegramClientAdapter, type TelegramOutboundMessage, type TelegramUpdate } from "../../telegram-integration/telegram-integration";

class TestTelegramClient implements TelegramClient {
  readonly id = "test-telegram";
  readonly version = "1.0.0";
  readonly target = "telegram" as const;
  private status: TelegramClient["getStatus"] extends () => infer T ? T : never = "created";
  readonly sent: TelegramOutboundMessage[] = [];
  readonly queued: TelegramUpdate[] = [];
  initialize(): void { this.status = "ready"; }
  start(): void { this.status = "running"; }
  stop(): void { this.status = "stopped"; }
  send(message: TelegramOutboundMessage): void { if (this.status !== "running") throw new Error("Client must be running."); this.sent.push({ ...message }); }
  poll(): readonly TelegramUpdate[] { if (this.status !== "running") throw new Error("Client must be running."); return this.queued.splice(0); }
  getStatus() { return this.status; }
}
class TestTelegramAdapter implements TelegramClientAdapter {
  readonly id = "test-adapter";
  readonly version = "1.0.0";
  readonly target = "telegram" as const;
  readonly client = new TestTelegramClient();
  supports(clientId: string): boolean { return clientId === this.client.id; }
  createClient(): TelegramClient { return this.client; }
}
const bot = { id: "bot-1", username: "freezzz_test_bot", version: "1.0.0" };

describe("TelegramIntegration", () => {
  it("runs lifecycle through an adapter", () => {
    const integration = new TelegramIntegration();
    const adapter = new TestTelegramAdapter();
    integration.clients.register(adapter);
    integration.initialize(bot);
    integration.selectClient("test-telegram");
    integration.start();
    expect(integration.status).toBe("running");
    expect(adapter.client.getStatus()).toBe("running");
    integration.stop();
    expect(integration.status).toBe("stopped");
  });
  it("routes updates independently", () => {
    const integration = new TelegramIntegration();
    const adapter = new TestTelegramAdapter();
    integration.clients.register(adapter);
    integration.initialize(bot);
    integration.selectClient("test-telegram");
    integration.start();
    const received: string[] = [];
    integration.updates.on("message", update => received.push(update.id));
    adapter.client.queued.push({ id: "update-1", type: "message", timestamp: 100, payload: new Uint8Array([1, 2, 3]) });
    const updates = integration.poll();
    expect(updates).toHaveLength(1);
    expect(received).toEqual(["update-1"]);
  });
  it("sends normalized outbound messages", () => {
    const integration = new TelegramIntegration();
    const adapter = new TestTelegramAdapter();
    integration.clients.register(adapter);
    integration.initialize(bot);
    integration.selectClient("test-telegram");
    integration.start();
    integration.send({ id: "message-1", chatId: "chat-1", text: "hello" });
    expect(adapter.client.sent[0].text).toBe("hello");
  });
  it("rejects invalid lifecycle and duplicate adapters", () => {
    const integration = new TelegramIntegration();
    const adapter = new TestTelegramAdapter();
    integration.clients.register(adapter);
    expect(() => integration.clients.register(adapter)).toThrow();
    expect(() => integration.start()).toThrow();
    integration.initialize(bot);
    expect(() => integration.start()).toThrow();
  });
});
