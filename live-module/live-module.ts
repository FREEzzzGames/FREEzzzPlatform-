import { BaseModule, type ModuleContext } from "../module-contract/module-contract";

export type LiveModuleStatus = "created" | "ready" | "running" | "stopped" | "failed";
export type LiveStreamStatus = "idle" | "loading" | "playing" | "paused" | "stopped" | "failed";
export type LiveStreamProtocol = "hls" | "dash" | "webrtc" | "progressive" | "custom";

export interface LiveChannel {
  readonly id: string;
  readonly name: string;
  readonly streamIds: readonly string[];
}

export interface LiveStream {
  readonly id: string;
  readonly channelId: string;
  readonly title: string;
  readonly source: string;
  readonly protocol: LiveStreamProtocol;
  readonly isLive: boolean;
}

export interface LivePlaybackState {
  readonly streamId: string;
  readonly status: LiveStreamStatus;
  readonly positionMs: number;
  readonly updatedAt: number;
}

export interface LivePlayer {
  readonly id: string;
  readonly version: string;
  readonly target: "web" | "android-native" | "telegram" | "custom";
  initialize(): void;
  load(stream: LiveStream): void;
  play(): void;
  pause(): void;
  stop(): void;
  getState(): LivePlaybackState;
}

export interface LivePlayerAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: LivePlayer["target"];
  supports(protocol: LiveStreamProtocol): boolean;
  createPlayer(): LivePlayer;
}

export class LivePlayerRegistry {
  private readonly adapters = new Map<string, LivePlayerAdapter>();

  register(adapter: LivePlayerAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("LIVE player adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`LIVE player adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): LivePlayerAdapter | undefined { return this.adapters.get(id); }
  list(): readonly LivePlayerAdapter[] { return [...this.adapters.values()]; }

  resolve(protocol: LiveStreamProtocol, target: LivePlayer["target"]): LivePlayerAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(protocol)) return adapter;
    }
    throw new Error(`No LIVE player supports protocol "${protocol}" for target "${target}".`);
  }
}

export class LiveCatalog {
  private readonly channels = new Map<string, LiveChannel>();
  private readonly streams = new Map<string, LiveStream>();

  addChannel(channel: LiveChannel): void {
    if (!channel.id.trim() || !channel.name.trim()) {
      throw new Error("LIVE channel id and name must not be empty.");
    }
    if (this.channels.has(channel.id)) {
      throw new Error(`LIVE channel "${channel.id}" already exists.`);
    }
    this.channels.set(channel.id, {
      ...channel,
      streamIds: [...channel.streamIds]
    });
  }

  addStream(stream: LiveStream): void {
    if (!stream.id.trim() || !stream.channelId.trim() || !stream.title.trim() || !stream.source.trim()) {
      throw new Error("LIVE stream identifiers, title and source must not be empty.");
    }
    if (!this.channels.has(stream.channelId)) {
      throw new Error(`LIVE channel "${stream.channelId}" does not exist.`);
    }
    if (this.streams.has(stream.id)) {
      throw new Error(`LIVE stream "${stream.id}" already exists.`);
    }
    const channel = this.channels.get(stream.channelId)!;
    this.streams.set(stream.id, { ...stream });
    this.channels.set(channel.id, {
      ...channel,
      streamIds: [...channel.streamIds, stream.id]
    });
  }

  removeStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    this.streams.delete(streamId);
    const channel = this.channels.get(stream.channelId);
    if (channel) {
      this.channels.set(channel.id, {
        ...channel,
        streamIds: channel.streamIds.filter(id => id !== streamId)
      });
    }
    return true;
  }

  getChannel(channelId: string): LiveChannel | undefined {
    const channel = this.channels.get(channelId);
    return channel ? { ...channel, streamIds: [...channel.streamIds] } : undefined;
  }

  getStream(streamId: string): LiveStream | undefined {
    const stream = this.streams.get(streamId);
    return stream ? { ...stream } : undefined;
  }

  listChannels(): readonly LiveChannel[] {
    return [...this.channels.values()].map(channel => ({
      ...channel,
      streamIds: [...channel.streamIds]
    }));
  }

  listStreams(channelId?: string): readonly LiveStream[] {
    return [...this.streams.values()]
      .filter(stream => channelId === undefined || stream.channelId === channelId)
      .map(stream => ({ ...stream }));
  }

  clear(): void {
    this.channels.clear();
    this.streams.clear();
  }
}

export interface LiveModuleApi {
  readonly status: LiveModuleStatus;
  readonly players: LivePlayerRegistry;
  readonly catalog: LiveCatalog;
  initialize(context: ModuleContext): void;
  start(): void;
  stop(): void;
  dispose(): void;
  registerChannel(channel: LiveChannel): void;
  registerStream(stream: LiveStream): void;
  load(streamId: string, target: LivePlayer["target"]): LivePlaybackState;
  play(): void;
  pause(): void;
  stopPlayback(): void;
}

export class LiveModule extends BaseModule implements LiveModuleApi {
  private statusValue: LiveModuleStatus = "created";
  private player?: LivePlayer;
  readonly players = new LivePlayerRegistry();
  readonly catalog = new LiveCatalog();

  constructor() {
    super({ id: "live", name: "LIVE", version: "1.0.0" });
  }

  get status(): LiveModuleStatus { return this.statusValue; }

  override initialize(context: ModuleContext): void {
    super.initialize(context);
    if (this.statusValue === "created" || this.statusValue === "stopped") {
      this.statusValue = "ready";
    }
  }

  start(): void {
    if (this.statusValue === "running") return;
    if (this.statusValue === "created") throw new Error("LIVE module must be initialized before starting.");
    if (this.statusValue !== "ready" && this.statusValue !== "stopped") {
      throw new Error(`LIVE module cannot start while status is "${this.statusValue}".`);
    }
    this.statusValue = "running";
  }

  stop(): void {
    if (this.statusValue === "created" || this.statusValue === "stopped") return;
    this.player?.stop();
    this.statusValue = "stopped";
  }

  override dispose(): void {
    this.player?.stop();
    this.player = undefined;
    super.dispose();
    this.catalog.clear();
    this.statusValue = "stopped";
  }

  registerChannel(channel: LiveChannel): void {
    this.requireRunning();
    this.catalog.addChannel(channel);
  }

  registerStream(stream: LiveStream): void {
    this.requireRunning();
    this.catalog.addStream(stream);
  }

  load(streamId: string, target: LivePlayer["target"]): LivePlaybackState {
    this.requireRunning();
    const stream = this.catalog.getStream(streamId);
    if (!stream) throw new Error(`LIVE stream "${streamId}" does not exist.`);
    const adapter = this.players.resolve(stream.protocol, target);
    this.player = adapter.createPlayer();
    this.player.initialize();
    this.player.load(stream);
    return this.player.getState();
  }

  play(): void {
    this.requirePlayer().play();
  }

  pause(): void {
    this.requirePlayer().pause();
  }

  stopPlayback(): void {
    this.requirePlayer().stop();
  }

  private requireRunning(): void {
    if (this.statusValue !== "running") throw new Error("LIVE module must be running.");
  }

  private requirePlayer(): LivePlayer {
    this.requireRunning();
    if (!this.player) throw new Error("LIVE has no loaded stream.");
    return this.player;
  }
}
