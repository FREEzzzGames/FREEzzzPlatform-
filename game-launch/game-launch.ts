import type { GameCatalog, GameCatalogEntry } from "../game-catalog/game-catalog";
import type { GameRuntime } from "../game-runtime/game-runtime";
import type { EmulatorComponents } from "../emulator/emulator";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";
import { GameSessionManager, type GameSession } from "../session-manager/session-manager";

export interface GameLaunchServices { readonly controller: ControllerCore; readonly audio: AudioCore; readonly saves: SaveSystem; }
export interface GameLaunchRequest { readonly gameId: string; readonly target?: "web"|"android"|"telegram"|"custom"; }
export interface GameLaunchResult { readonly entry: GameCatalogEntry; readonly session: GameSession; readonly target: NonNullable<GameLaunchRequest["target"]>; }

export class GameLaunchPipeline {
  constructor(private readonly catalog: GameCatalog, private readonly runtime: GameRuntime, private readonly sessions: GameSessionManager) {}
  launch(request: GameLaunchRequest, components: EmulatorComponents, services: GameLaunchServices): GameLaunchResult {
    const entry = this.catalog.get(request.gameId);
    if (!entry) throw new Error(`Game is not available: ${request.gameId}`);
    const target = request.target ?? "web";
    if (!["web","android","telegram","custom"].includes(target)) throw new Error(`Unsupported game target: ${target}`);
    const session = this.sessions.create(this.catalog, entry.id, components, services, target);
    this.sessions.start(session.id);
    return Object.freeze({ entry, session, target });
  }
}
