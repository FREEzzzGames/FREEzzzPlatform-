import { BaseModule, type ModuleContext } from "../module-contract/module-contract";

export type ChatModuleStatus = "created" | "ready" | "running" | "stopped" | "failed";

export interface ChatParticipant {
  readonly id: string;
  readonly displayName: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly text: string;
  readonly timestamp: number;
}

export interface ChatConversation {
  readonly id: string;
  readonly participants: readonly ChatParticipant[];
}

export interface ChatTransport {
  readonly id: string;
  readonly version: string;
  readonly target: "web" | "android-native" | "telegram" | "custom";
  connect(): void;
  disconnect(): void;
  send(message: ChatMessage): void;
  getStatus(): "disconnected" | "connected" | "failed";
}

export interface ChatTransportAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: ChatTransport["target"];
  supports(transportId: string): boolean;
  createTransport(): ChatTransport;
}

export class ChatTransportRegistry {
  private readonly adapters = new Map<string, ChatTransportAdapter>();

  register(adapter: ChatTransportAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Chat transport adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Chat transport adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): ChatTransportAdapter | undefined { return this.adapters.get(id); }
  list(): readonly ChatTransportAdapter[] { return [...this.adapters.values()]; }

  resolve(transportId: string, target: ChatTransportAdapter["target"]): ChatTransportAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(transportId)) return adapter;
    }
    throw new Error(`No chat transport supports "${transportId}" for target "${target}".`);
  }
}

export class ChatStore {
  private readonly conversations = new Map<string, ChatConversation>();
  private readonly messages = new Map<string, ChatMessage[]>();

  addConversation(conversation: ChatConversation): void {
    if (!conversation.id.trim()) throw new Error("Conversation id must not be empty.");
    if (this.conversations.has(conversation.id)) {
      throw new Error(`Conversation "${conversation.id}" already exists.`);
    }
    this.conversations.set(conversation.id, {
      ...conversation,
      participants: conversation.participants.map(participant => ({ ...participant }))
    });
    this.messages.set(conversation.id, []);
  }

  removeConversation(conversationId: string): boolean {
    const removed = this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    return removed;
  }

  getConversation(conversationId: string): ChatConversation | undefined {
    const conversation = this.conversations.get(conversationId);
    return conversation
      ? { ...conversation, participants: conversation.participants.map(participant => ({ ...participant })) }
      : undefined;
  }

  listConversations(): readonly ChatConversation[] {
    return [...this.conversations.values()].map(conversation => ({
      ...conversation,
      participants: conversation.participants.map(participant => ({ ...participant }))
    }));
  }

  append(message: ChatMessage): void {
    if (!message.id.trim() || !message.conversationId.trim() || !message.senderId.trim()) {
      throw new Error("Chat message identifiers must not be empty.");
    }
    if (!Number.isFinite(message.timestamp)) throw new Error("Chat message timestamp must be finite.");
    if (!this.conversations.has(message.conversationId)) {
      throw new Error(`Conversation "${message.conversationId}" does not exist.`);
    }
    if (this.messages.get(message.conversationId)?.some(item => item.id === message.id)) {
      throw new Error(`Chat message "${message.id}" already exists.`);
    }
    this.messages.get(message.conversationId)?.push({ ...message });
  }

  listMessages(conversationId: string): readonly ChatMessage[] {
    return [...(this.messages.get(conversationId) ?? [])].map(message => ({ ...message }));
  }

  clear(): void {
    this.conversations.clear();
    this.messages.clear();
  }
}

export interface ChatModuleApi {
  readonly status: ChatModuleStatus;
  readonly transports: ChatTransportRegistry;
  readonly store: ChatStore;
  initialize(context: ModuleContext): void;
  start(): void;
  stop(): void;
  dispose(): void;
  addConversation(conversation: ChatConversation): void;
  receive(message: ChatMessage): void;
  send(message: ChatMessage, transportId: string, target: ChatTransport["target"]): void;
}

export class ChatModule extends BaseModule implements ChatModuleApi {
  private statusValue: ChatModuleStatus = "created";
  readonly transports = new ChatTransportRegistry();
  readonly store = new ChatStore();

  constructor() {
    super({ id: "chat", name: "CHAT", version: "1.0.0" });
  }

  get status(): ChatModuleStatus { return this.statusValue; }

  override initialize(context: ModuleContext): void {
    super.initialize(context);
    if (this.statusValue === "created" || this.statusValue === "stopped") {
      this.statusValue = "ready";
    }
  }

  start(): void {
    if (this.statusValue === "running") return;
    if (this.statusValue === "created") throw new Error("CHAT module must be initialized before starting.");
    if (this.statusValue !== "ready" && this.statusValue !== "stopped") {
      throw new Error(`CHAT module cannot start while status is "${this.statusValue}".`);
    }
    this.statusValue = "running";
  }

  stop(): void {
    if (this.statusValue === "created" || this.statusValue === "stopped") return;
    this.statusValue = "stopped";
  }

  override dispose(): void {
    super.dispose();
    this.store.clear();
    this.statusValue = "stopped";
  }

  addConversation(conversation: ChatConversation): void {
    this.requireRunning();
    this.store.addConversation(conversation);
  }

  receive(message: ChatMessage): void {
    this.requireRunning();
    this.store.append(message);
  }

  send(message: ChatMessage, transportId: string, target: ChatTransport["target"]): void {
    this.requireRunning();
    this.store.append(message);
    const adapter = this.transports.resolve(transportId, target);
    const transport = adapter.createTransport();
    transport.connect();
    transport.send(message);
    transport.disconnect();
  }

  private requireRunning(): void {
    if (this.statusValue !== "running") {
      throw new Error("CHAT module must be running.");
    }
  }

  protected override onDispose(): void {
    for (const adapter of this.transports.list()) {
      void adapter;
    }
  }
}
