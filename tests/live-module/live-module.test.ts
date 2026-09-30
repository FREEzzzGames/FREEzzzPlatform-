import { describe, expect, it } from "vitest";
import {
  LiveModule,
  LiveCatalog,
  type LivePlayer,
  type LivePlayerAdapter,
  type LiveStream
} from "../../live-module/live-module";

class TestPlayer implements LivePlayer {
  readonly id = "test-player";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  private state: "idle" | "loading" | "playing" | "paused" | "stopped" | "failed" = "idle";
  private streamId = "";
  private positionMs = 0;

  initialize(): void { this.state = "idle"; }
  load(stream: LiveStream): void { this.streamId = stream.id; this.positionMs = 0; this.state = "loading"; }
  play(): void { this.state = "playing"; }
  pause(): void { this.state = "paused"; }
  stop(): void { this.state = "stopped"; }
  getState() {
    return { streamId: this.streamId, status: this.state, positionMs: this.positionMs, updatedAt: 100 };
  }
}

class TestAdapter implements LivePlayerAdapter {
  readonly id = "test-live";
  readonly version = "1.0.0";
  readonly target = "custom" as const;
  readonly player = new TestPlayer();

  supports(protocol: LiveStream["protocol"]): boolean { return protocol === "custom"; }
  createPlayer(): LivePlayer { return this.player; }
}

const channel = { id: "channel-1", name: "Test Channel", streamIds: [] } as const;
const stream: LiveStream = {
  id: "stream-1",
  channelId: "channel-1",
  title: "Test Stream",
  source: "https://example.invalid/live",
  protocol: "custom",
  isLive: true
};

describe("Stage 18 — LIVE Module", () => {
  it("keeps channel and stream catalog relationships consistent", () => {
    const catalog = new LiveCatalog();
    catalog.addChannel(channel);
    catalog.addStream(stream);
    expect(catalog.getChannel("channel-1")?.streamIds).toEqual(["stream-1"]);
    expect(catalog.listStreams("channel-1")).toEqual([stream]);
    expect(catalog.removeStream("stream-1")).toBe(true);
    expect(catalog.getChannel("channel-1")?.streamIds).toEqual([]);
  });

  it("loads and controls a stream through a target adapter", () => {
    const module = new LiveModule();
    const adapter = new TestAdapter();
    module.players.register(adapter);
    module.initialize({ ownerCoreId: "test-core" });
    module.start();
    module.registerChannel(channel);
    module.registerStream(stream);
    expect(module.load("stream-1", "custom").status).toBe("loading");
    module.play();
    expect(adapter.player.getState().status).toBe("playing");
    module.pause();
    expect(adapter.player.getState().status).toBe("paused");
    module.stopPlayback();
    expect(adapter.player.getState().status).toBe("stopped");
  });

  it("rejects unsupported target/protocol combinations", () => {
    const module = new LiveModule();
    module.players.register(new TestAdapter());
    module.initialize({ ownerCoreId: "test-core" });
    module.start();
    module.registerChannel(channel);
    module.registerStream(stream);
    expect(() => module.load("stream-1", "web")).toThrow();
  });

  it("keeps LIVE independent from platform implementations", () => {
    const module = new LiveModule();
    expect(module.metadata.id).toBe("live");
    expect(module.status).toBe("created");
  });
});
