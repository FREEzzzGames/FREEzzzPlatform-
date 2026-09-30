import type { EmulatorComponents } from "../emulator/emulator";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";
import type { GameCatalog, GameCatalogEntry } from "../game-catalog/game-catalog";
import { GameRuntime } from "../game-runtime/game-runtime";
import { GameExecutionSession, type GameExecutionManifest } from "../game-execution/game-execution";

export type GameSessionStatus = "created" | "running" | "paused" | "stopped" | "failed";

export interface GameSession {
  readonly id: string;
  readonly gameId: string;
  readonly createdAt: number;
  readonly execution: GameExecutionSession;
  getStatus(): GameSessionStatus;
}

export class GameSessionManager {
  private readonly sessions = new Map<string, GameSession>();

  constructor(private readonly runtime: GameRuntime) {}

  create(
    catalog: GameCatalog,
    gameId: string,
    components: EmulatorComponents,
    services: { readonly controller: ControllerCore; readonly audio: AudioCore; readonly saves: SaveSystem },
    target: GameExecutionManifest["target"] = "web",
    sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  ): GameSession {
    if (this.sessions.has(sessionId)) throw new Error(`Session already exists: ${sessionId}`);
    const entry = catalog.get(gameId);
    if (!entry) throw new Error(`Game is not available: ${gameId}`);
    const execution = this.runtime.create(
      { id: entry.id, name: entry.name, version: entry.version, emulatorId: entry.emulatorId, target },
      components,
      services
    );
    const session: GameSession = {
      id: sessionId,
      gameId,
      createdAt: Date.now(),
      execution,
      getStatus: () => this.mapStatus(execution.getStatus())
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  start(sessionId: string): void { this.require(sessionId).execution.start(); }
  pause(sessionId: string): void { this.require(sessionId).execution.pause(); }
  resume(sessionId: string): void { this.require(sessionId).execution.resume(); }
  stop(sessionId: string): void { this.require(sessionId).execution.stop(); }
  destroy(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.execution.getStatus() !== "stopped" && session.execution.getStatus() !== "created") session.execution.stop();
    return this.sessions.delete(sessionId);
  }
  get(sessionId: string): GameSession | undefined { return this.sessions.get(sessionId); }
  list(): readonly GameSession[] { return [...this.sessions.values()]; }

  private require(sessionId: string): GameSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Game session not found: ${sessionId}`);
    return session;
  }

  private mapStatus(status: ReturnType<GameExecutionSession["getStatus"]>): GameSessionStatus {
    if (status === "starting" || status === "running") return "running";
    if (status === "paused") return "paused";
    if (status === "stopping" || status === "stopped") return "stopped";
    if (status === "failed") return "failed";
    return "created";
  }
}
