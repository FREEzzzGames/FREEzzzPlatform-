import { describe, expect, it } from "vitest";
import {
  ChatModule,
  ChatStore,
  type ChatMessage,
  type ChatTransport,
  type ChatTransportAdapter
} from "../../chat-module/chat-module";

class TestTransport implements ChatTransport {
  readonly id = "test-transport";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  private status: "disconnected" | "connected" | "failed" = "disconnected";
  readonly sent: ChatMessage[] = [];

  connect(): void { this.status = "connected"; }
  disconnect(): void { this.status = "disconnected"; }
  send(message: ChatMessage): void {
    if (this.status !== "connected") throw new Error("Transport is not connected.");
    this.sent.push(message);
  }
  getStatus() { return this.status; }
}

class TestAdapter implements ChatTransportAdapter {
  readonly id = "test-chat";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  readonly transport = new TestTransport();

  supports(transportId: string): boolean { return transportId === "test-transport"; }
  createTransport(): ChatTransport { return this.transport; }
}

const conversation = {
  id: "general",
  participants: [{ id: "user-1", displayName: "User" }]
} as const;

const message: ChatMessage = {
  id: "message-1",
  conversationId: "general",
  senderId: "user-1",
  text: "hello",
  timestamp: 100
};

describe("Stage 17 — CHAT Module", () => {
  it("stores conversations and isolates returned data", () => {
    const store = new ChatStore();
    store.addConversation(conversation);
    const result = store.getConversation("general");
    expect(result?.id).toBe("general");
    expect(result?.participants).not.toBe(conversation.participants);
  });

  it("stores received messages only in existing conversations", () => {
    const module = new ChatModule();
    module.initialize({ ownerCoreId: "test-core" });
    module.start();
    module.addConversation(conversation);
    module.receive(message);
    expect(module.store.listMessages("general")).toEqual([message]);
    expect(() => module.receive({ ...message, id: "missing", conversationId: "unknown" })).toThrow();
  });

  it("routes outgoing messages through a target adapter", () => {
    const module = new ChatModule();
    const adapter = new TestAdapter();
    module.transports.register(adapter);
    module.initialize({ ownerCoreId: "test-core" });
    module.start();
    module.addConversation(conversation);
    module.send(message, "test-transport", "custom");
    expect(adapter.transport.sent).toEqual([message]);
  });

  it("keeps CHAT independent from a specific platform", () => {
    const module = new ChatModule();
    expect(module.metadata.id).toBe("chat");
    expect(module.status).toBe("created");
  });
});
