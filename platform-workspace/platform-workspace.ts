import type { PlatformHost } from "../platform-host/platform-host";

export type PlatformWorkspaceView = "home" | "library" | "chat" | "live" | "radio" | "system";
export type PlatformWorkspaceStatus = "created" | "ready" | "degraded";

export interface PlatformWorkspaceState {
  readonly view: PlatformWorkspaceView;
  readonly status: PlatformWorkspaceStatus;
  readonly revision: number;
  readonly lastError: string | null;
}

export interface PlatformWorkspaceSnapshot {
  readonly view: PlatformWorkspaceView;
  readonly revision: number;
}

export class PlatformWorkspace {
  private view: PlatformWorkspaceView = "home";
  private revision = 0;
  private lastError: string | null = null;

  constructor(readonly host: PlatformHost) {}

  start(): void {
    try {
      this.host.start();
      this.lastError = null;
    } catch (cause) {
      this.lastError = cause instanceof Error ? cause.message : String(cause);
      throw cause;
    }
  }

  stop(): void {
    this.host.stop();
  }

  navigate(view: PlatformWorkspaceView): void {
    if (this.view === view) return;
    this.view = view;
    this.revision += 1;
  }

  reportError(error: unknown): void {
    this.lastError = error instanceof Error ? error.message : String(error);
  }

  clearError(): void {
    this.lastError = null;
  }

  getState(): PlatformWorkspaceState {
    const hostReady = this.host.getStatus() === "ready";
    return Object.freeze({
      view: this.view,
      status: this.lastError ? "degraded" : hostReady ? "ready" : "created",
      revision: this.revision,
      lastError: this.lastError
    });
  }

  snapshot(): PlatformWorkspaceSnapshot {
    return Object.freeze({ view: this.view, revision: this.revision });
  }

  restore(snapshot: PlatformWorkspaceSnapshot): void {
    this.view = snapshot.view;
    this.revision = snapshot.revision;
  }
}
