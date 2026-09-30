export type TelegramIntegrationStatus = "created" | "ready" | "running" | "stopped" | "failed";
export type TelegramClientStatus = "created" | "ready" | "running" | "stopped" | "failed";
export type TelegramUpdateType = "message" | "callback" | "command" | "custom";

export interface TelegramUser { readonly id: string; readonly username?: string; readonly displayName?: string; }
export interface TelegramUpdate { readonly id: string; readonly type: TelegramUpdateType; readonly timestamp: number; readonly user?: TelegramUser; readonly payload: Uint8Array; }
export interface TelegramOutboundMessage { readonly id: string; readonly chatId: string; readonly text: string; readonly replyToUpdateId?: string; }
export interface TelegramBotInfo { readonly id: string; readonly username: string; readonly version: string; }

export interface TelegramClient {
  readonly id: string;
  readonly version: string;
  readonly target: "telegram" | "custom";
  initialize(): void;
  start(): void;
  stop(): void;
  send(message: TelegramOutboundMessage): void;
  poll(): readonly TelegramUpdate[];
  getStatus(): TelegramClientStatus;
}
export interface TelegramClientAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: TelegramClient["target"];
  supports(clientId: string): boolean;
  createClient(): TelegramClient;
}

export class TelegramClientRegistry {
  private readonly adapters = new Map<string, TelegramClientAdapter>();
  register(adapter: TelegramClientAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) throw new Error("Telegram client adapter must contain id and version.");
    if (this.adapters.has(adapter.id)) throw new Error("Telegram client adapter already exists.");
    this.adapters.set(adapter.id, adapter);
  }
  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): TelegramClientAdapter | undefined { return this.adapters.get(id); }
  list(): readonly TelegramClientAdapter[] { return [...this.adapters.values()]; }
  resolve(clientId: string, target: TelegramClient["target"] = "telegram"): TelegramClientAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(clientId)) return adapter;
    }
    throw new Error("No Telegram client supports the requested client and target.");
  }
}

export type TelegramUpdateHandler = (update: TelegramUpdate) => void;
export class TelegramUpdateRouter {
  private readonly handlers = new Map<TelegramUpdateType, Set<TelegramUpdateHandler>>();
  on(type: TelegramUpdateType, handler: TelegramUpdateHandler): () => void {
    const handlers = this.handlers.get(type) ?? new Set<TelegramUpdateHandler>();
    handlers.add(handler);
    this.handlers.set(type, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(type);
    };
  }
  dispatch(update: TelegramUpdate): void {
    for (const handler of [...(this.handlers.get(update.type) ?? [])]) handler(update);
    for (const handler of [...(this.handlers.get("custom") ?? [])]) handler(update);
  }
  clear(): void { this.handlers.clear(); }
}

export interface TelegramIntegrationApi {
  readonly status: TelegramIntegrationStatus;
  readonly clients: TelegramClientRegistry;
  readonly updates: TelegramUpdateRouter;
  initialize(bot: TelegramBotInfo): void;
  selectClient(clientId: string, target?: TelegramClient["target"]): void;
  start(): void;
  stop(): void;
  send(message: TelegramOutboundMessage): void;
  poll(): readonly TelegramUpdate[];
  dispose(): void;
}

export class TelegramIntegration implements TelegramIntegrationApi {
  private statusValue: TelegramIntegrationStatus = "created";
  private bot?: TelegramBotInfo;
  private client?: TelegramClient;
  readonly clients = new TelegramClientRegistry();
  readonly updates = new TelegramUpdateRouter();

  get status(): TelegramIntegrationStatus { return this.statusValue; }

  initialize(bot: TelegramBotInfo): void {
    if (this.statusValue !== "created" && this.statusValue !== "stopped") throw new Error("Telegram integration cannot initialize in the current state.");
    if (!bot.id.trim() || !bot.username.trim() || !bot.version.trim()) throw new Error("Telegram bot info must contain id, username and version.");
    this.bot = Object.freeze({ ...bot });
    this.statusValue = "ready";
  }

  selectClient(clientId: string, target: TelegramClient["target"] = "telegram"): void {
    if (this.statusValue === "running") throw new Error("Telegram client cannot be changed while running.");
    this.client = this.clients.resolve(clientId, target).createClient();
  }

  start(): void {
    if (this.statusValue === "running") return;
    if (this.statusValue === "created") throw new Error("Telegram integration must be initialized before starting.");
    if (this.statusValue !== "ready" && this.statusValue !== "stopped") throw new Error("Telegram integration cannot start in the current state.");
    if (!this.client) throw new Error("Telegram client must be selected before starting.");
    this.client.initialize();
    this.client.start();
    this.statusValue = "running";
  }

  stop(): void {
    if (this.statusValue === "created" || this.statusValue === "stopped") return;
    this.client?.stop();
    this.statusValue = "stopped";
  }

  send(message: TelegramOutboundMessage): void {
    this.requireRunning();
    if (!message.id.trim() || !message.chatId.trim() || !message.text.trim()) throw new Error("Telegram message id, chat id and text must not be empty.");
    this.client!.send({ ...message });
  }

  poll(): readonly TelegramUpdate[] {
    this.requireRunning();
    const updates = this.client!.poll();
    for (const update of updates) {
      if (!update.id.trim() || !Number.isFinite(update.timestamp)) throw new Error("Telegram update id and timestamp must be valid.");
      this.updates.dispatch({ ...update, payload: update.payload.slice() });
    }
    return updates.map(update => ({ ...update, payload: update.payload.slice() }));
  }

  dispose(): void {
    this.stop();
    this.updates.clear();
    this.client = undefined;
    this.bot = undefined;
    this.statusValue = "stopped";
  }

  getBotInfo(): TelegramBotInfo | undefined { return this.bot ? { ...this.bot } : undefined; }

  private requireRunning(): void {
    if (this.statusValue !== "running") throw new Error("Telegram integration must be running.");
  }
}
