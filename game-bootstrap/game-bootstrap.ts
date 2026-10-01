import { GameCatalog } from "../game-catalog/game-catalog";
import { GameContentRegistry, MemoryGameContentSource, sha256 } from "../content-layer/content-layer";

const DEMO_GAME_ID = "freezzz-demo";
const DEMO_VERSION = "1.0.0";
const DEMO_EMULATOR = "nes";
const DEMO_CONTENT_ID = "freezzz-demo-program";

// Tiny original 6502 program understood by the built-in NES reference emulator.
// It writes a changing seed to RAM and loops forever, giving the web canvas a
// deterministic moving frame without bundling any third-party game ROM.
const DEMO_PROGRAM = new Uint8Array([
  0xA9, 0x2A,       // LDA #$2A
  0x8D, 0x00, 0x00, // STA $0000
  0x4C, 0x00, 0x80  // JMP $8000
]);

export function registerWebDemoGame(
  catalog: GameCatalog,
  registry: GameContentRegistry,
  source: MemoryGameContentSource
): void {
  const checksum = sha256(DEMO_PROGRAM);
  source.register({
    id: DEMO_CONTENT_ID,
    gameId: DEMO_GAME_ID,
    kind: "rom",
    version: DEMO_VERSION,
    size: DEMO_PROGRAM.length,
    checksum
  }, DEMO_PROGRAM);

  registry.register({
    gameId: DEMO_GAME_ID,
    version: DEMO_VERSION,
    emulatorId: DEMO_EMULATOR,
    entryContentId: DEMO_CONTENT_ID,
    requiredContent: []
  });

  catalog.register({
    id: DEMO_GAME_ID,
    name: "FREEzzz NES Demo",
    version: DEMO_VERSION,
    emulatorId: DEMO_EMULATOR,
    content: {
      gameId: DEMO_GAME_ID,
      version: DEMO_VERSION,
      emulatorId: DEMO_EMULATOR,
      entryContentId: DEMO_CONTENT_ID,
      requiredContent: []
    },
    metadata: {
      description: "Original local runtime test game for FREEzzz Platform.",
      genre: "Runtime Test",
      publisher: "FREEzzzGames",
      tags: ["demo", "runtime", "nes"]
    }
  });
}
