import type { SaveSystem, SaveKind } from "../save-system/save-system";
import type { GameSession } from "../session-manager/session-manager";

export interface PersistedGameSession {
  readonly sessionId: string;
  readonly gameId: string;
  readonly savedAt: number;
  readonly status: "created" | "running" | "paused" | "stopped" | "failed";
  readonly payload: Uint8Array;
}

export interface SessionPersistenceCodec {
  readonly version: string;
  encode(session: GameSession, payload: Uint8Array, now: number): Uint8Array;
  decode(data: Uint8Array): PersistedGameSession;
}

export class JsonSessionPersistenceCodec implements SessionPersistenceCodec {
  readonly version = "1.0.0";
  encode(session: GameSession, payload: Uint8Array, now: number): Uint8Array {
    const record: PersistedGameSession = {
      sessionId: session.id,
      gameId: session.gameId,
      savedAt: now,
      status: session.getStatus(),
      payload: payload.slice()
    };
    return new TextEncoder().encode(JSON.stringify({ ...record, payload: Array.from(record.payload) }));
  }

  decode(data: Uint8Array): PersistedGameSession {
    const value = JSON.parse(new TextDecoder().decode(data)) as PersistedGameSession & { payload: number[] };
    if (!value.sessionId?.trim() || !value.gameId?.trim() || !Array.isArray(value.payload)) {
      throw new Error("Persisted game session is invalid.");
    }
    return { ...value, payload: Uint8Array.from(value.payload) };
  }
}

export class SessionPersistence {
  private readonly kind: SaveKind = "state";
  constructor(private readonly saves: SaveSystem, private readonly codec: SessionPersistenceCodec = new JsonSessionPersistenceCodec()) {}

  save(session: GameSession, payload: Uint8Array, now = Date.now()): PersistedGameSession {
    const encoded = this.codec.encode(session, payload, now);
    this.saves.save(this.slot(session.id), this.kind, this.codec.version, encoded, now);
    return this.codec.decode(encoded);
  }

  load(sessionId: string): PersistedGameSession | undefined {
    const slot = this.saves.load(this.slot(sessionId));
    return slot ? this.codec.decode(slot.payload) : undefined;
  }

  delete(sessionId: string): boolean {
    return this.saves.delete(this.slot(sessionId));
  }

  private slot(sessionId: string): string {
    if (!sessionId.trim()) throw new Error("Session id must not be empty.");
    return "session:" + sessionId;
  }
}
