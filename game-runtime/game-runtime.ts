import { EmulatorAdapterRegistry, type EmulatorComponents, type Emulator } from "../emulator/emulator";
import { NESAdapter } from "../emulators/nes/nes-emulator";
import { GameExecutionSession, type GameExecutionManifest, type GameExecutionServices } from "../game-execution/game-execution";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";
import type { GameContentResolver } from "../content-layer/content-layer";

export interface GameRuntimeServices {
  readonly controller: ControllerCore;
  readonly audio: AudioCore;
  readonly saves: SaveSystem;
}

export interface GameRuntimeOptions {
  readonly adapters?: EmulatorAdapterRegistry;
  readonly content?: GameContentResolver;
}

export class GameRuntime {
  readonly adapters: EmulatorAdapterRegistry;
  private readonly content?: GameContentResolver;

  constructor(options: GameRuntimeOptions = {}) {
    this.adapters = options.adapters ?? new EmulatorAdapterRegistry();
    this.content = options.content;
    if (!this.adapters.get("nes-reference")) this.adapters.register(new NESAdapter());
  }

  create(manifest: GameExecutionManifest, components: EmulatorComponents, services: GameRuntimeServices): GameExecutionSession {
    const adapter = this.adapters.resolve(manifest.emulatorId);
    const resolvedContent = this.content?.resolve(manifest.id, manifest.emulatorId);
    if (resolvedContent && resolvedContent.manifest.version !== manifest.version) {
      throw new Error("Game content version does not match execution manifest.");
    }
    const emulator: Emulator = adapter.create(components);
    if (resolvedContent) {
      const loadProgram = (emulator as Emulator & { loadProgram?: (program: Uint8Array) => void }).loadProgram;
      if (!loadProgram) throw new Error("Emulator does not expose the required content loading boundary.");
      loadProgram.call(emulator, resolved.entry);
    }
    const executionServices: GameExecutionServices = {
      emulator,
      emulatorComponents: components,
      controller: services.controller,
      audio: services.audio,
      saves: services.saves
    };
    return new GameExecutionSession(manifest, executionServices);
  }
}
