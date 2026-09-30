import type { GameCatalog, GameCatalogEntry } from "../game-catalog/game-catalog";
import type { GameSession, GameSessionManager } from "../session-manager/session-manager";
import type { EmulatorComponents } from "../emulator/emulator";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";
import { SessionPersistence } from "../session-persistence/session-persistence";
import type { ControllerInput } from "../controller-core/controller-core";

export type WebPlayerView = "library" | "game";
export type WebPlayerStatus = "idle" | "ready" | "playing" | "paused" | "error";

export interface WebPlayerState {
  readonly view: WebPlayerView;
  readonly status: WebPlayerStatus;
  readonly selectedGameId: string | null;
  readonly sessionId: string | null;
  readonly error: string | null;
}

export interface WebPlayerServices {
  readonly sessions: GameSessionManager;
  readonly components: EmulatorComponents;
  readonly controller: ControllerCore;
  readonly audio: AudioCore;
  readonly saves: SaveSystem;
  readonly persistence?: SessionPersistence;
}

export class WebPlayer {
  private view: WebPlayerView = "library";
  private status: WebPlayerStatus = "idle";
  private selectedGameId: string | null = null;
  private sessionId: string | null = null;
  private error: string | null = null;

  constructor(
    readonly catalog: GameCatalog,
    readonly services: WebPlayerServices
  ) {}

  getState(): WebPlayerState {
    return Object.freeze({
      view: this.view,
      status: this.status,
      selectedGameId: this.selectedGameId,
      sessionId: this.sessionId,
      error: this.error
    });
  }

  listGames(): readonly GameCatalogEntry[] { return this.catalog.list(); }

  select(gameId: string): GameCatalogEntry {
    const entry = this.catalog.get(gameId);
    if (!entry) throw new Error("Game is not available: " + gameId);
    this.selectedGameId = gameId;
    this.view = "library";
    this.status = "ready";
    this.error = null;
    return entry;
  }

  launch(): GameSession {
    if (!this.selectedGameId) throw new Error("Select a game before launching.");
    try {
      const session = this.services.sessions.create(
        this.catalog,
        this.selectedGameId,
        this.services.components,
        { controller: this.services.controller, audio: this.services.audio, saves: this.services.saves }
      );
      this.services.sessions.start(session.id);
      this.sessionId = session.id;
      this.view = "game";
      this.status = "playing";
      this.error = null;
      return session;
    } catch (cause) {
      this.status = "error";
      this.error = cause instanceof Error ? cause.message : String(cause);
      throw cause;
    }
  }

  pause(): void { this.requireSession(); this.services.sessions.pause(this.sessionId!); this.status = "paused"; }
  resume(): void { this.requireSession(); this.services.sessions.resume(this.sessionId!); this.status = "playing"; }
  exit(): void {
    if (this.sessionId) this.services.sessions.stop(this.sessionId);
    this.sessionId = null;
    this.view = "library";
    this.status = this.selectedGameId ? "ready" : "idle";
  }

  frame(): void { this.requireSession(); this.services.sessions.get(this.sessionId!)!.execution.stepFrame(); }

  saveState(now?: number): void { this.requireSession(); const persistence = this.services.persistence ?? new SessionPersistence(this.services.saves); persistence.saveSession(this.services.sessions.get(this.sessionId!)!, now); }

  restoreState(): void { this.requireSession(); const persistence = this.services.persistence ?? new SessionPersistence(this.services.saves); persistence.restoreSession(this.services.sessions.get(this.sessionId!)!); }

  input(): readonly ControllerInput[] { this.requireSession(); return this.services.controller.poll(); }

  getSession(): GameSession | undefined {
    return this.sessionId ? this.services.sessions.get(this.sessionId) : undefined;
  }

  private requireSession(): void {
    if (!this.sessionId || !this.services.sessions.get(this.sessionId)) throw new Error("No active game session.");
  }
}
