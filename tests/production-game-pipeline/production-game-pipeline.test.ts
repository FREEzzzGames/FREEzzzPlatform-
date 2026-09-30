import { describe, expect, it } from "vitest";
import { GameCatalog } from "../../game-catalog/game-catalog";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { GameSessionManager } from "../../session-manager/session-manager";
import { GameLaunchPipeline } from "../../game-launch/game-launch";
import { GameLibraryProjection } from "../../game-library/game-library";
import { LibraryModule } from "../../library-module/library-module";
import { ProductionGamePipeline } from "../../production-game-pipeline/production-game-pipeline";
import { PlatformRuntimeBinding } from "../../platform-runtime/platform-binding";
import { UnifiedPlatformRuntime } from "../../platform-runtime/platform-runtime";
import { MemoryTargetStorageAdapter } from "../../storage/platform-storage";
import { PlatformSessionPersistence } from "../../platform-session/platform-session";
import { MemoryStorage } from "../../storage/storage";
import { PlatformWorkspace } from "../../platform-workspace/platform-workspace";
import { PlatformShell } from "../../platform-shell/platform-shell";
import { PlatformHost } from "../../platform-host/platform-host";
import type { EmulatorComponents } from "../../emulator/emulator";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";

function setup() {
  const catalog = new GameCatalog();
  catalog.register({
    id: "game-1", name: "Game 1", version: "1.0.0", emulatorId: "nes-reference",
    content: { gameId: "game-1", version: "1.0.0", emulatorId: "nes-reference", entryContentId: "rom", requiredContent: [] }
  });
  const library = new LibraryModule();
  library.initialize({ ownerCoreId:"test-core", coreRegistry: {} } as never); library.start();
  const projection = new GameLibraryProjection(catalog, library);
  const launch = new GameLaunchPipeline(catalog, new GameRuntime(), new GameSessionManager(new GameRuntime()));
  const runtime = new UnifiedPlatformRuntime("web");
  const binding = new PlatformRuntimeBinding(runtime, new MemoryTargetStorageAdapter("web"));
  const shell = new PlatformShell();
  const host = new PlatformHost({ id: "test-host", name: "Test Host", version: "1.0.0", target: "web" }, shell);
  const workspace = new PlatformWorkspace(host);
  const persistence = new PlatformSessionPersistence(new MemoryTargetStorageAdapter("web"));
  return { catalog, projection, launch, binding, workspace, persistence };
}

describe("ProductionGamePipeline", () => {
  it("selects from library and persists a restorable session", () => {
    const { projection, launch, binding, workspace, persistence } = setup();
    const pipeline = new ProductionGamePipeline(projection, launch, binding, persistence, workspace);
    expect(pipeline.select("game-1").id).toBe("game:game-1");

    const controller = new DefaultControllerCore(); controller.initialize();
    const audio = new DefaultAudioCore(); audio.initialize();
    const saves = new DefaultSaveSystem(new StorageSaveProvider(new MemoryStorage()));
    const components = {} as EmulatorComponents;

    expect(() => pipeline.launchSelected({ components, services: { controller, audio, saves } })).toThrow();
  });

  it("requires a selected library game before launch", () => {
    const { projection, launch, binding, workspace, persistence } = setup();
    const pipeline = new ProductionGamePipeline(projection, launch, binding, persistence, workspace);
    expect(() => pipeline.save()).toThrow("No game session");
  });
});
