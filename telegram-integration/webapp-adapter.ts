import type { TelegramClient, TelegramClientAdapter, TelegramOutboundMessage, TelegramUpdate, TelegramUser } from "./telegram-integration";

export interface TelegramWebAppBridge {
  readonly initData?: string;
  readonly initDataUnsafe?: Readonly<{
    user?: { id: number; username?: string; first_name?: string; last_name?: string };
  }>;
  ready(): void;
  expand(): void;
  close(): void;
  sendData?(data: string): void;
}

export class TelegramWebAppClient implements TelegramClient {
  readonly id = "telegram-webapp";
  readonly version = "1.1.0";
  readonly target = "telegram" as const;
  private status: "created" | "ready" | "running" | "stopped" | "failed" = "created";
  private readonly queue: TelegramUpdate[] = [];

  constructor(private readonly bridge: TelegramWebAppBridge) {}

  initialize(): void {
    this.bridge.ready();
    this.bridge.expand();
    this.status = "ready";
  }

  start(): void {
    if (this.status !== "ready" && this.status !== "stopped") throw new Error("Telegram WebApp client is not ready.");
    this.status = "running";
  }

  stop(): void { this.status = "stopped"; }

  send(message: TelegramOutboundMessage): void {
    if (this.status !== "running") throw new Error("Telegram WebApp client is not running.");
    const payload = JSON.stringify({ type: "message", ...message });
    if (payload.length > 4096) throw new Error("Telegram WebApp message payload exceeds the WebApp data limit.");
    this.bridge.sendData?.(payload);
  }

  poll(): readonly TelegramUpdate[] {
    const updates = this.queue.splice(0);
    return updates.map(update => ({ ...update, payload: update.payload.slice() }));
  }

  enqueue(update: TelegramUpdate): void {
    this.queue.push({ ...update, payload: update.payload.slice() });
  }

  getUser(): TelegramUser | undefined {
    const user = this.bridge.initDataUnsafe?.user;
    if (!user) return undefined;
    return Object.freeze({
      id: String(user.id),
      username: user.username,
      displayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || undefined
    });
  }

  getStatus() { return this.status; }
}

export class TelegramWebAppAdapter implements TelegramClientAdapter {
  readonly id = "telegram-webapp";
  readonly version = "1.1.0";
  readonly target = "telegram" as const;

  constructor(private readonly bridge: TelegramWebAppBridge) {}
  supports(id: string) { return id === "telegram-webapp"; }
  createClient() { return new TelegramWebAppClient(this.bridge); }
}
