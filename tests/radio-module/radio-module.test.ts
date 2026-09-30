import { describe, expect, it } from "vitest";
import {
  RadioCatalog,
  RadioModule,
  type RadioPlayer,
  type RadioPlayerAdapter,
  type RadioStation
} from "../../radio-module/radio-module";

class TestPlayer implements RadioPlayer {
  readonly id = "test-radio-player";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  private status: "idle" | "loading" | "playing" | "paused" | "stopped" | "failed" = "idle";
  private stationId?: string;

  initialize(): void { this.status = "idle"; }
  load(station: RadioStation): void { this.stationId = station.id; this.status = "loading"; }
  play(): void { this.status = "playing"; }
  pause(): void { this.status = "paused"; }
  stop(): void { this.status = "stopped"; }
  getState() {
    return { stationId: this.stationId, status: this.status, positionMs: 0, updatedAt: 100 };
  }
}

class TestAdapter implements RadioPlayerAdapter {
  readonly id = "test-radio";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  readonly player = new TestPlayer();
  supports(format: string): boolean { return format === "test"; }
  createPlayer(): RadioPlayer { return this.player; }
}

const station: RadioStation = {
  id: "station-1",
  name: "Test Radio",
  stream: "https://example.invalid/radio",
  format: "test",
  metadata: { language: "en" }
};

describe("Stage 19 — RADIO Module", () => {
  it("stores stations and isolates returned metadata", () => {
    const catalog = new RadioCatalog();
    catalog.addStation(station);
    const result = catalog.getStation("station-1");
    expect(result).toEqual(station);
    expect(result?.metadata).not.toBe(station.metadata);
  });

  it("loads and controls a station through a target adapter", () => {
    const module = new RadioModule();
    const adapter = new TestAdapter();
    module.players.register(adapter);
    module.initialize({ ownerCoreId: "test-core" });
    module.start();
    module.registerStation(station);
    expect(module.load("station-1", "custom").status).toBe("loading");
    module.play();
    expect(adapter.player.getState().status).toBe("playing");
    module.pause();
    expect(adapter.player.getState().status).toBe("paused");
    module.stopPlayback();
    expect(adapter.player.getState().status).toBe("stopped");
  });

  it("rejects unsupported target and format combinations", () => {
    const module = new RadioModule();
    module.players.register(new TestAdapter());
    module.initialize({ ownerCoreId: "test-core" });
    module.start();
    module.registerStation(station);
    expect(() => module.load("station-1", "web")).toThrow();
  });

  it("is an independent module", () => {
    const module = new RadioModule();
    expect(module.metadata.id).toBe("radio");
    expect(module.status).toBe("created");
  });
});
