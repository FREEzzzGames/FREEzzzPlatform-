import type { EmulatorComponents } from "../emulator/emulator";
import type { GameLaunchPipeline, GameLaunchResult } from "../game-launch/game-launch";
import type { GameSession } from "../session-manager/session-manager";
import type { GameLibraryProjection } from "../game-library/game-library";
import type { LibraryItem } from "../library-module/library-module";
import type { PlatformRuntimeBinding } from "../platform-runtime/platform-binding";
import type { PlatformSessionPersistence, PlatformSessionState } from "../platform-session/platform-session";
import type { PlatformWorkspace } from "../platform-workspace/platform-workspace";

export interface ProductionGamePipelineServices {
  readonly controller: import("../controller-core/controller-core").ControllerCore;
  readonly audio: import("../audio-core/audio-core").AudioCore;
  readonly saves: import("../save-system/save-system").SaveSystem;
}

export interface ProductionGamePipelineLaunchOptions {
  readonly components: EmulatorComponents;
  readonly services: ProductionGamePipelineServices;
}

export interface ProductionGamePipelineState {
  readonly selectedGameId: string | null;
  readonly sessionId: string | null;
  readonly status: ReturnType<GameSession["getStatus"]> | null;
  readonly restored: boolean;
}

export class ProductionGamePipeline {
  private selectedGameId: string | null = null;
  private currentSession: GameSession | null = null;
  private restored = false;

  constructor(
    private readonly library: GameLibraryProjection,
    private readonly launch: GameLaunchPipeline,
    private readonly binding: PlatformRuntimeBinding,
    private readonly sessions: PlatformSessionPersistence,
    private readonly workspace: PlatformWorkspace
  ) {}

  syncLibrary(): void {
    this.library.sync();
    this.library.removeMissing();
  }

  select(gameId: string): LibraryItem {
    this.syncLibrary();
    const item = this.library.get(gameId);
    if (!item) throw new Error(`Game is not in the library: ${gameId}`);
    this.selectedGameId = gameId;
    this.restored = false;
    return item;
  }

  launchSelected(options: ProductionGamePipelineLaunchOptions): GameLaunchResult {
    if (!this.selectedGameId) throw new Error("No game is selected.");
    this.binding.start();
    const result = this.launch.launch(
      { gameId: this.selectedGameId, target: this.binding.getBinding().target },
      options.components,
      options.services
    );
    this.currentSession = result.session;
    this.restored = false;
    return result;
  }

  pause(): void {
    this.requireSession().execution.pause();
  }

  resume(): void {
    this.requireSession().execution.resume();
  }

  save(): PlatformSessionState {
    const session = this.requireSession();
    const snapshot = this.launch.snapshot(session.id);
    return this.sessions.save({
      workspace: this.workspace.snapshot(),
      selectedGameId: this.selectedGameId,
      target: this.binding.getBinding().target,
      sessionId: session.id,
      gameSnapshot: Object.freeze(Array.from(snapshot))
    });
  }

  restoreSaved(options: ProductionGamePipelineLaunchOptions): GameLaunchResult | undefined {
    const saved = this.sessions.load();
    if (!saved?.selectedGameId) return undefined;

    const currentTarget = this.binding.getBinding().target;
    if (saved.target && saved.target !== currentTarget) {
      throw new Error(`Saved session target "${saved.target}" does not match current target "${currentTarget}".`);
    }
    this.select(saved.selectedGameId);
    const result = this.launchSelected(options);
    if (saved.gameSnapshot && saved.gameSnapshot.length > 0) {
      this.launch.restore(result.session.id, Uint8Array.from(saved.gameSnapshot));
      this.restored = true;
    }
    this.sessions.restore(this.workspace, saved);
    return result;
  }

  saveAndStop(): PlatformSessionState {
    const saved = this.save();
    const session = this.currentSession;
    if (session && session.getStatus() !== "stopped") session.execution.stop();
    this.currentSession = null;
    this.binding.stop();
    return saved;
  }

  stopWithoutSave(): void {
    if (this.currentSession && this.currentSession.getStatus() !== "stopped") {
      this.currentSession.execution.stop();
    }
    this.currentSession = null;
    this.binding.stop();
  }

  clearSaved(): void {
    this.sessions.clear();
  }

  getState(): ProductionGamePipelineState {
    return Object.freeze({
      selectedGameId: this.selectedGameId,
      sessionId: this.currentSession?.id ?? null,
      status: this.currentSession?.getStatus() ?? null,
      restored: this.restored
    });
  }

  private requireSession(): GameSession {
    if (!this.currentSession) throw new Error("No game session.");
    return this.currentSession;
  }
}
