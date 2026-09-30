import type { SaveSystem, SaveKind } from "../save-system/save-system";
import type { GameSession } from "../session-manager/session-manager";

export interface PersistedGameSession {
  readonly sessionId: string;
  readonly gameId: string;
  readonly emulatorId: string;
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
  readonly version = "2.0.0";

  encode(session: GameSession, payload: Uint8Array, now: number): Uint8Array {
    const record: PersistedGameSession = {
      sessionId: session.id,
      gameId: session.gameId,
      emulatorId: session.execution.manifest.emulatorId,
      savedAt: now,
      status: session.getStatus(),
      payload: payload.slice()
    };
    return new TextEncoder().encode(JSON.stringify({ ...record, payload: Array.from(record.payload) }));
  }

  decode(data: Uint8Array): PersistedGameSession {
    let value: PersistedGameSession & { payload: number[] };
    try {
      value = JSON.parse(new TextDecoder().decode(data)) as PersistedGameSession & { payload: number[] };
    } catch {
      throw new Error("Persisted game session is not valid JSON.");
    }
    if (!value.sessionId?.trim() || !value.gameId?.trim() || !value.emulatorId?.trim() ||
        !Number.isFinite(value.savedAt) || !Array.isArray(value.payload)) {
      throw new Error("Persisted game session is invalid.");
    }
    if (value.payload.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
      throw new Error("Persisted game session contains invalid payload bytes.");
    }
    return { ...value, payload: Uint8Array.from(value.payload) };
  }
}

export class SessionPersistence {
  private readonly kind: SaveKind = "state";

  constructor(
    private readonly saves: SaveSystem,
    private readonly codec: SessionPersistenceCodec = new JsonSessionPersistenceCodec()
  ) {}

  save(session: GameSession, payload: Uint8Array, now = Date.now()): PersistedGameSession {
    const encoded = this.codec.encode(session, payload, now);
    this.saves.save(this.slot(session.id), this.kind, this.codec.version, encoded, now);
    return this.codec.decode(encoded);
  }

  saveSession(session: GameSession, now = Date.now()): PersistedGameSession {
    return this.save(session, session.execution.snapshotState(), now);
  }

  load(sessionId: string): PersistedGameSession | undefined {
    const slot = this.saves.load(this.slot(sessionId));
    return slot ? this.codec.decode(slot.payload) : undefined;
  }

  restoreSession(session: GameSession): PersistedGameSession {
    const persisted = this.load(session.id);
    if (!persisted) throw new Error("No persisted session found: " + session.id);
    if (persisted.gameId !== session.gameId) {
      throw new Error("Persisted game does not match session: " + session.id);
    }
    if (persisted.emulatorId !== session.execution.manifest.emulatorId) {
      throw new Error("Persisted emulator does not match session: " + session.id);
    }
    session.execution.restoreState(persisted.payload);
    return persisted;
  }

  delete(sessionId: string): boolean {
    return this.saves.delete(this.slot(sessionId));
  }

  private slot(sessionId: string): string {
    if (!sessionId.trim()) throw new Error("Session id must not be empty.");
    return "session:" + sessionId;
  }
}