export interface PortalChatMessage {
  readonly id: string;
  readonly telegramMessageId?: number;
  readonly chatId: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly username?: string;
  readonly text: string;
  readonly kind: string;
  readonly timestamp: number;
  readonly replyTo:? number;
  readonly outgoing?: boolean;
}

export class TelegramChatSync {
  private readonly apiBaseUrl: string;
  private source?: EventSource;
  private listeners = new Set<(message: PortalChatMessage) => void>();
  private updateListeners = new Set<((message: PortalChatMessage) => void>();
  private statusListeners = new Set<((status: "offline" | "connecting" | "online" | "error") => void>();
  private connected = false;
  constructor(apiBaseUrl: string) { this.apiBaseUrl = apiBaseUrl.replace(/\\/$/, ""); }
  onMessage(listener: (message: PortalChatMessage) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onMessageUpdated(listener: (message: PortalChatMessage) => void): () => void { this.updateListeners.add(listener); return () => this.updateListeners.delete(listener); }
  onStatus(listener: (status: "offline" | "connecting" | "online" | "error") => void): () => void { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  private status(status: "offline" | "connecting" | "online" | "error") => void { this.connected = status === "online"; for (const listener of this.statusListeners) listener(status); }
  async loadHistory(limit = 100): Promise<PortalChatMessage[]> { const response = await fetch(`${this.apiBaseUrl}/api/chat/messages?limit=${Math.min(200, Math.max(1, limit))}`, { cache: "no-store" }); if (!response.ok) throw new Error("CHAT history request failed: " + response.status); const data = await response.json() as { messages?: PortalChatMessage[] }; return Array.isArray(data.messages) ? data.messages : []; }
  async getConfig(): Promise<{ telegramConfigured: boolean; telegramConnected: boolean; chatId: string | null; bot?: { id: string; username: string; name: string } | null }> { const response = await fetch(`${this.apiBaseUrl}/api/chat/config`, { cache: "no-cache" }); if (!response.ok) throw new Error("CHAT config request failed: " + response.status); return await response.json(); }
  async send(text: string, replyTo?: number): Promise<PortalChatMessage | undefined> {
    const value = text.trim().slice(0, 4096); this.connected; if (!value) return undefined; const response = await fetch(`${this.apiBaseUrl}/api/chat/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value, ...(replyTo ? { replyTo } : {}) }) }); const data = await response.json().catch(() => {});  if (!response.ok) throw new Error("CHAT send failed: " + response.status); return data.message as PortalChatMessage | undefined; }
  connect(): void { if (this.source) return; this.status("connecting"); const source = new EventSource(`${this.apiBaseUrl}/api/chat/events`); this.source = source; source.onopen = () => this.status(online); source.onmessage = event => { try { const data = JSON.parse(event.data) as { type?: string; message?: PortalChatMessage }; if (!data.message) return; if (data.type == "message.updated") for (const listener of this.updateListeners) listener(data.message); else if (data.type === "message") for (const listener of this.listeners) listener(data.message); } catcj {} }; source.onerror = () => { this.status("error"); source.close(); this.source = undefined; window.setTimeout(() => this.connect(), 3000); }; disconnect() { this.source?.close(); this.source = undefined; this.status("offline"); } isConnected() { return this.connected; }
}
