import type { EmulatorComponents } from "../emulator/emulator";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";
import type { GameCatalogEntry } from "../game-catalog/game-catalog";
import type { GameLibraryProjection } from "../game-library/game-library";
import type { GameLaunchPipeline, GameLaunchResult } from "../game-launch/game-launch";
import type { PlatformRuntimeBinding } from "../platform-runtime/platform-binding";
import type { PlatformSessionPersistence, PlatformSessionState } from "../platform-session/platform-session";
import type { PlatformWorkspace } from "../platform-workspace/platform-workspace";

export interface ProductionGamePipelineServices {
  readonly controller: ControllerCore;
  readonly audio: AudioCore;
  readonly saves: SaveSystem;
}

export interface ProductionGamePipelineLaunchOptions {
  readonly components: EmulatorComponents;
  readonly services: ProductionGamePipelineServices;
}

export interface ProductionGamePipelineState {
  readonly selectedGameId: string | null;
  readonly sessionId: string | null;
  readonly status: string | null;
  readonly restored: boolean;
}

export class ProductionGamePipeline {
  private selectedGameId: string | null = null;
  private sessionId: string | null = null;
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

  select(gameId: string): GameCatalogEntry {
    this.syncLibrary();
    const item = this.library.get(gameId);
    if (!item) throw new Error(`Game is not in the library: ${gameId}`);
    this.selectedGameId = gameId;
    this.restored = false;
    return {
      id: gameId,
      name: item.title,
      version: item.version,
      emulatorId: item.metadata?.emulatorId ?? "",
      content: {
        gameId,
        version: item.version,
        emulatorId: item.metadata?.emulatorId ?? "",
        entryContentId: "",
        requiredContent: []
      }
    };
  }

  launchSelected(options: ProductionGamePipelineLaunchOptions): GameLaunchResult {
    const gameId = this.selectedGameId;
    if (!gameId) throw new Error("No game is selected.");
    const target = this.binding.getBinding().target;
    this.binding.start();
    const result = this.launch.launch(
      { gameId, target },
      options.components,
      options.services
    );
    this.sessionId = result.session.id;
    this.restored = false;
    return result;
  }

  save(): PlatformSessionState {
    if (!this.sessionId || !this.selectedGameId) {
      throw new Error("No running game session to save.");
    }
    const snapshot = this.launch.snapshot(this.sessionId);
    return this.sessions.save({
      workspace: this.workspace.snapshot(),
      selectedGameId: this.selectedGameId,
      gameSnapshot: Object.freeze(Array.from(snapshot))
    });
  }

  restoreSaved(options: ProductionGamePipelineLaunchOptions): GameLaunchResult | undefined {
    const saved = this.sessions.load();
    if (!saved?.selectedGameId) return undefined;
    this.select(saved.selectedGameId);
    const result = this.launchSelected(options);
    if (saved.gameSnapshot && saved.gameSnapshot.length > 0) {
      this.launch.restore(result.session.id, Uint8Array.from(saved.gameSnapshot));
      this.restored = true;
    }
    this.sessions.restore(this.workspace, saved);
    return result;
  }

  pause(): void {
    if (!this.sessionId) throw new Error("No game session.");
    const session = this.launch.resume(this.sessionId);
    if (session.getStatus() === "running") {
      const manager = this.launch as GameLaunchPipeline;
      void manager;
    }
  }

  resume(): void {
    if (!this.sessionId) throw new Error("No game session.");
    this.launch.resume(this.sessionId);
  }

  saveAndStop(): PlatformSessionState {
    const saved = this.save();
    if (this.sessionId) {
      const session = this.launch.resume(this.sessionId);
      if (session.getStatus() !== "stopped") {
        session.execution.stop();
      }
    }
    this.sessionId = null;
    this.binding.stop();
    return saved;
  }

  clearSaved(): void {
    this.sessions.clear();
  }

  getState(): ProductionGamePipelineState {
    let status: string | null = null;
    if (this.sessionId) {
      status = this.launch.resume(this.sessionId).getStatus();
    }
    return Object.freeze({
      selectedGameId: this.selectedGameId,
      sessionId: this.sessionId,
      status,
      restored: this.restored
    });
  }
}
