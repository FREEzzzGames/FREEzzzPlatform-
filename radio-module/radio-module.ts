import { BaseModule, type ModuleContext } from "../module-contract/module-contract";

export type RadioModuleStatus = "created" | "ready" | "running" | "stopped" | "failed";
export type RadioPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "stopped" | "failed";

export interface RadioStation {
  readonly id: string;
  readonly name: string;
  readonly stream: string;
  readonly format: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface RadioPlaybackState {
  readonly stationId?: string;
  readonly status: RadioPlaybackStatus;
  readonly positionMs: number;
  readonly updatedAt: number;
}

export interface RadioPlayer {
  readonly id: string;
  readonly version: string;
  readonly target: "web" | "android-native" | "telegram" | "custom";
  initialize(): void;
  load(station: RadioStation): void;
  play(): void;
  pause(): void;
  stop(): void;
  getState(): RadioPlaybackState;
}

export interface RadioPlayerAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: RadioPlayer["target"];
  supports(format: string): boolean;
  createPlayer(): RadioPlayer;
}

export class RadioPlayerRegistry {
  private readonly adapters = new Map<string, RadioPlayerAdapter>();

  register(adapter: RadioPlayerAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Radio player adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Radio player adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): RadioPlayerAdapter | undefined { return this.adapters.get(id); }
  list(): readonly RadioPlayerAdapter[] { return [...this.adapters.values()]; }

  resolve(format: string, target: RadioPlayer["target"]): RadioPlayerAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(format)) return adapter;
    }
    throw new Error(`No RADIO player supports format "${format}" for target "${target}".`);
  }
}

export class RadioCatalog {
  private readonly stations = new Map<string, RadioStation>();

  addStation(station: RadioStation): void {
    if (!station.id.trim() || !station.name.trim() || !station.stream.trim() || !station.format.trim()) {
      throw new Error("Radio station id, name, stream and format must not be empty.");
    }
    if (this.stations.has(station.id)) {
      throw new Error(`Radio station "${station.id}" already exists.`);
    }
    this.stations.set(station.id, {
      ...station,
      metadata: station.metadata ? { ...station.metadata } : undefined
    });
  }

  removeStation(stationId: string): boolean {
    return this.stations.delete(stationId);
  }

  getStation(stationId: string): RadioStation | undefined {
    const station = this.stations.get(stationId);
    return station ? { ...station, metadata: station.metadata ? { ...station.metadata } : undefined } : undefined;
  }

  listStations(): readonly RadioStation[] {
    return [...this.stations.values()].map(station => ({
      ...station,
      metadata: station.metadata ? { ...station.metadata } : undefined
    }));
  }

  clear(): void { this.stations.clear(); }
}

export interface RadioModuleApi {
  readonly status: RadioModuleStatus;
  readonly players: RadioPlayerRegistry;
  readonly catalog: RadioCatalog;
  initialize(context: ModuleContext): void;
  start(): void;
  stop(): void;
  dispose(): void;
  registerStation(station: RadioStation): void;
  load(stationId: string, target: RadioPlayer["target"]): RadioPlaybackState;
  play(): void;
  pause(): void;
  stopPlayback(): void;
}

export class RadioModule extends BaseModule implements RadioModuleApi {
  private statusValue: RadioModuleStatus = "created";
  private player?: RadioPlayer;
  readonly players = new RadioPlayerRegistry();
  readonly catalog = new RadioCatalog();

  constructor() {
    super({ id: "radio", name: "RADIO", version: "1.0.0" });
  }

  get status(): RadioModuleStatus { return this.statusValue; }

  override initialize(context: ModuleContext): void {
    super.initialize(context);
    if (this.statusValue === "created" || this.statusValue === "stopped") this.statusValue = "ready";
  }

  start(): void {
    if (this.statusValue === "running") return;
    if (this.statusValue === "created") throw new Error("RADIO module must be initialized before starting.");
    if (this.statusValue !== "ready" && this.statusValue !== "stopped") {
      throw new Error(`RADIO module cannot start while status is "${this.statusValue}".`);
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

  registerStation(station: RadioStation): void {
    this.requireRunning();
    this.catalog.addStation(station);
  }

  load(stationId: string, target: RadioPlayer["target"]): RadioPlaybackState {
    this.requireRunning();
    const station = this.catalog.getStation(stationId);
    if (!station) throw new Error(`RADIO station "${stationId}" does not exist.`);
    const adapter = this.players.resolve(station.format, target);
    this.player?.stop();
    this.player = adapter.createPlayer();
    this.player.initialize();
    this.player.load(station);
    return this.player.getState();
  }

  play(): void { this.requirePlayer().play(); }
  pause(): void { this.requirePlayer().pause(); }
  stopPlayback(): void { this.requirePlayer().stop(); }

  private requireRunning(): void {
    if (this.statusValue !== "running") throw new Error("RADIO module must be running.");
  }

  private requirePlayer(): RadioPlayer {
    this.requireRunning();
    if (!this.player) throw new Error("RADIO has no loaded station.");
    return this.player;
  }
}
