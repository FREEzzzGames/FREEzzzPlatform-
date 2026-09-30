import type { Emulator, EmulatorComponents } from "../emulator/emulator";
import type { ControllerCore } from "../controller-core/controller-core";
import type { AudioCore } from "../audio-core/audio-core";
import type { SaveSystem, SaveKind } from "../save-system/save-system";
import type { NativePerformanceEngine } from "../native-performance/native-performance";

export type GameExecutionStatus = "created" | "starting" | "running" | "paused" | "stopping" | "stopped" | "failed";

export interface GameExecutionManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly emulatorId: string;
  readonly target: "web" | "android" | "telegram" | "custom";
}

export interface GameExecutionServices {
  readonly emulator: Emulator;
  readonly emulatorComponents: EmulatorComponents;
  readonly controller: ControllerCore;
  readonly audio: AudioCore;
  readonly saves: SaveSystem;
  readonly performance?: NativePerformanceEngine;
}

export interface GameExecutionDiagnostics {
  readonly status: GameExecutionStatus;
  readonly manifest: GameExecutionManifest;
  readonly frames: number;
  readonly startedAt: number | null;
  readonly lastFrameAt: number | null;
  readonly error: Error | null;
}

export class GameExecutionSession {
  private status: GameExecutionStatus = "created";
  private frames = 0;
  private startedAt: number | null = null;
  private lastFrameAt: number | null = null;
  private error: Error | null = null;

  constructor(
    readonly manifest: GameExecutionManifest,
    private readonly services: GameExecutionServices
  ) {
    if (!manifest.id.trim() || !manifest.name.trim() || !manifest.version.trim() || !manifest.emulatorId.trim()) {
      throw new Error("Game execution manifest must contain id, name, version and emulatorId.");
    }
  }

  start(): void {
    if (this.status === "running") return;
    if (this.status === "starting" || this.status === "stopping") {
      throw new Error(`Game execution cannot start while status is "${this.status}".`);
    }
    this.status = "starting";
    this.error = null;
    try {
      this.services.controller.start();
      this.services.audio.start();
      this.services.performance?.initialize();
      this.services.performance?.start();
      this.services.emulator.start({ emulator: this.services.emulator.metadata });
      this.startedAt = Date.now();
      this.lastFrameAt = null;
      this.frames = 0;
      this.status = "running";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      this.safeStop();
      throw error;
    }
  }

  pause(): void {
    if (this.status !== "running") throw new Error("Game execution must be running before pause.");
    this.status = "paused";
  }

  resume(): void {
    if (this.status !== "paused") throw new Error("Game execution must be paused before resume.");
    this.status = "running";
  }

  stepFrame(): void {
    if (this.status !== "running") throw new Error("Game execution must be running before stepping a frame.");
    try {
      this.services.controller.poll();
      this.services.emulator.runFrame();
      this.frames += 1;
      this.lastFrameAt = Date.now();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      this.safeStop();
      throw error;
    }
  }

  save(slotId: string, kind: SaveKind, version: string, payload: Uint8Array, now?: number): void {
    if (this.status !== "running" && this.status !== "paused") {
      throw new Error("Game execution must be running or paused before saving.");
    }
    this.services.saves.save(slotId, kind, version, payload, now);
  }

  load(slotId: string) {
    if (this.status === "created" || this.status === "stopped") {
      throw new Error("Game execution must be active before loading a save.");
    }
    return this.services.saves.load(slotId);
  }

  stop(): void {
    if (this.status === "created" || this.status === "stopped") return;
    if (this.status === "starting") throw new Error("Game execution cannot stop while starting.");
    if (this.status === "stopping") return;
    this.status = "stopping";
    try {
      this.safeStop();
      this.status = "stopped";
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.error = error;
      this.status = "failed";
      throw error;
    }
  }

  getStatus(): GameExecutionStatus {
    return this.status;
  }

  getDiagnostics(): GameExecutionDiagnostics {
    return Object.freeze({
      status: this.status,
      manifest: this.manifest,
      frames: this.frames,
      startedAt: this.startedAt,
      lastFrameAt: this.lastFrameAt,
      error: this.error
    });
  }

  private safeStop(): void {
    try { this.services.emulator.stop(); } finally {
      try { this.services.audio.stop(); } finally {
        try { this.services.controller.stop(); } finally {
          this.services.performance?.stop();
        }
      }
    }
  }
}
