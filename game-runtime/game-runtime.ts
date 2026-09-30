import { EmulatorAdapterRegistry, type EmulatorComponents, type Emulator } from "../emulator/emulator";
import { NESAdapter } from "../emulators/nes/nes-emulator";
import { GameExecutionSession, type GameExecutionManifest, type GameExecutionServices } from "../game-execution/game-execution";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem } from "../save-system/save-system";

export interface GameRuntimeServices {
  readonly controller: ControllerCore;
  readonly audio: AudioCore;
  readonly saves: SaveSystem;
}

export interface GameRuntimeOptions {
  readonly adapters?: EmulatorAdapterRegistry;
}

export class GameRuntime {
  readonly adapters: EmulatorAdapterRegistry;

  constructor(options: GameRuntimeOptions = {}) {
    this.adapters = options.adapters ?? new EmulatorAdapterRegistry();
    if (!this.adapters.get("nes-reference")) this.adapters.register(new NESAdapter());
  }

  create(
    manifest: GameExecutionManifest,
    components: EmulatorComponents,
    services: GameRuntimeServices
  ): GameExecutionSession {
    const adapter = this.adapters.resolve(manifest.emulatorId);
    const emulator: Emulator = adapter.create(components);
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
