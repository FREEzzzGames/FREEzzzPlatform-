import { describe, expect, it } from "vitest";
import { GameCatalog } from "../../game-catalog/game-catalog";
import { GameRuntime } from "../../game-runtime/game-runtime";
import { GameSessionManager } from "../../session-manager/session-manager";
import { GameLaunchPipeline } from "../../game-launch/game-launch";
import { DefaultControllerCore } from "../../controller-core/controller-core";
import { DefaultAudioCore } from "../../audio-core/audio-core";
import { DefaultSaveSystem, StorageSaveProvider } from "../../save-system/save-system";
import { MemoryStorage } from "../../storage/storage";
import type { EmulatorComponents } from "../../emulator/emulator";

describe("GameLaunchPipeline", () => {
  it("validates the catalog boundary before creating a session", () => {
    const catalog = new GameCatalog();
    const manifest = { gameId:"game-1", version:"1.0.0", emulatorId:"nes-reference", entryContentId:"rom", requiredContent:[] };
    catalog.register({ id:"game-1", name:"Game 1", version:"1.0.0", emulatorId:"nes-reference", content:manifest });
    const runtime = new GameRuntime();
    const sessions = new GameSessionManager(runtime);
    const pipeline = new GameLaunchPipeline(catalog, runtime, sessions);
    const components = {} as EmulatorComponents;
    const storage = new MemoryStorage();
    const controller = new DefaultControllerCore(); controller.initialize();
    const audio = new DefaultAudioCore(); audio.initialize();
    const saves = new DefaultSaveSystem(new StorageSaveProvider(storage));
    expect(() => pipeline.launch({gameId:"missing",target:"android"}, components, {controller,audio,saves})).toThrow("not available");
  });
});
